import base64
import hashlib
import secrets
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import AuthSession, User


class AuthService:
    def __init__(self, session: Session):
        self.session = session

    def login(self, username: str, password: str) -> tuple[str, User] | None:
        user = self.session.scalar(select(User).where(User.username == username.strip()))
        if user is None or not self._verify_password(password, user.password_hash):
            return None
        token = secrets.token_urlsafe(48)
        self.session.add(AuthSession(user_id=user.id, token_hash=self._token_hash(token)))
        self.session.commit()
        return token, user

    def user_for_token(self, token: str) -> User | None:
        token_hash = self._token_hash(token)
        auth_session = self.session.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))
        if auth_session is None:
            return None
        auth_session.last_used_at = datetime.now(UTC)
        return self.session.get(User, auth_session.user_id)

    def logout(self, token: str) -> None:
        auth_session = self.session.scalar(
            select(AuthSession).where(AuthSession.token_hash == self._token_hash(token))
        )
        if auth_session is not None:
            self.session.delete(auth_session)
            self.session.commit()

    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def _verify_password(password: str, encoded_hash: str) -> bool:
        try:
            algorithm, iterations, salt_text, expected_text = encoded_hash.split("$", 3)
            if algorithm != "pbkdf2_sha256":
                return False
            salt = base64.urlsafe_b64decode(salt_text)
            expected = base64.urlsafe_b64decode(expected_text)
            actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
            return secrets.compare_digest(actual, expected)
        except (ValueError, TypeError):
            return False
