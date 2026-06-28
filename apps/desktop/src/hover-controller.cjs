const { screen } = require("electron");

class HoverController {
  constructor({ apiClient, dictionary, windowManager, onStateChanged, onPreferenceChanged }) {
    this.apiClient = apiClient;
    this.dictionary = dictionary;
    this.windowManager = windowManager;
    this.onStateChanged = onStateChanged;
    this.onPreferenceChanged = onPreferenceChanged;
    this.enabled = false;
    this.timer = null;
    this.requestRunning = false;
    this.lastCandidate = "";
    this.stableCandidateCount = 0;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled, { persist = true } = {}) {
    this.enabled = enabled;
    this.dismiss();
    if (this.timer) clearInterval(this.timer);
    this.timer = enabled ? setInterval(() => void this.#poll(), 350) : null;
    if (persist) this.onPreferenceChanged(enabled);
    this.onStateChanged();
  }

  dismiss() {
    this.windowManager.dismissHover();
    this.lastCandidate = "";
    this.stableCandidateCount = 0;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async #poll() {
    if (!this.enabled || this.requestRunning || this.windowManager.isHoverVisible()) return;
    this.requestRunning = true;
    const point = screen.getCursorScreenPoint();
    const physicalPoint = screen.dipToScreenPoint(point);
    try {
      const result = await this.apiClient.request(
        "GET",
        `/api/system/word-at-point?x=${physicalPoint.x}&y=${physicalPoint.y}`,
      );
      const word = result.status === 200 ? result.data?.word || "" : "";
      if (!word) {
        this.lastCandidate = "";
        this.stableCandidateCount = 0;
      } else if (word === this.lastCandidate) {
        this.stableCandidateCount += 1;
        if (this.stableCandidateCount >= 2) {
          await this.windowManager.showHoverWord({
            word,
            addCount: Number(result.data?.add_count || 0),
            point,
            dictionary: this.dictionary.lookup(word),
          });
        }
      } else {
        this.lastCandidate = word;
        this.stableCandidateCount = 1;
      }
    } catch {
      this.lastCandidate = "";
      this.stableCandidateCount = 0;
    } finally {
      this.requestRunning = false;
    }
  }
}

module.exports = { HoverController };
