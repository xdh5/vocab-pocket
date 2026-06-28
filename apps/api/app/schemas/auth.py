from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    daily_review_target: int
    daily_new_target: int


class UserSettingsUpdate(BaseModel):
    daily_review_target: int = Field(ge=0, le=200)
    daily_new_target: int = Field(ge=0, le=100)


class LoginResponse(BaseModel):
    token: str
    user: UserRead
