const { searchWord } = require("ecdict");

const POS_LABELS = {
  n: "n",
  v: "v",
  vi: "vi",
  vt: "vt",
  a: "adj",
  adj: "adj",
  ad: "adv",
  adv: "adv",
  prep: "prep",
  pron: "pron",
  conj: "conj",
  num: "num",
  art: "art",
  int: "int",
  aux: "aux",
};

const FORM_LABELS = {
  p: "过去式",
  d: "过去分词",
  i: "现在分词",
  3: "第三人称单数",
  s: "复数",
  r: "比较级",
  t: "最高级",
};

class DictionaryService {
  lookup(word) {
    try {
      const entry = searchWord(word, { caseInsensitive: true, withRoot: true });
      if (!entry?.translation) return this.#emptyResult(word);
      const headword = entry.lemma || entry.word || word;
      const exchangeForms = this.#parseExchange(entry.exchange || "");
      return {
        headword,
        formType: this.#findFormType(word, headword, exchangeForms),
        commonForms: [...new Set([headword, ...exchangeForms.map((item) => item.form)])],
        phonetic: entry.phonetic || "",
        meanings: this.#parseMeanings(entry.translation),
      };
    } catch (error) {
      console.error("Dictionary lookup failed", error);
      return this.#emptyResult(word);
    }
  }

  #emptyResult(word) {
    return { headword: word, formType: "原形", commonForms: [word], phonetic: "", meanings: [] };
  }

  #parseExchange(exchange) {
    return exchange
      .split("/")
      .map((item) => {
        const separator = item.indexOf(":");
        return separator > 0
          ? { code: item.slice(0, separator), form: item.slice(separator + 1).trim() }
          : null;
      })
      .filter((item) => item?.form);
  }

  #findFormType(word, headword, exchangeForms) {
    if (word.toLowerCase() === headword.toLowerCase()) return "原形";
    const match = exchangeForms.find((item) => item.form.toLowerCase() === word.toLowerCase());
    return FORM_LABELS[match?.code] || "变体";
  }

  #parseMeanings(translation) {
    const meanings = [];
    for (const line of translation.split("\\n")) {
      const match = line.trim().match(/^([a-z]+)\.\s*(.+)$/i);
      if (!match) continue;
      const pos = POS_LABELS[match[1].toLowerCase()] || match[1].toLowerCase();
      const text = match[2]
        .split(/[,，;/]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join("，");
      if (text && !meanings.some((item) => item.pos === pos && item.text === text)) {
        meanings.push({ pos, text });
      }
      if (meanings.length >= 3) break;
    }
    return meanings;
  }
}

module.exports = { DictionaryService };
