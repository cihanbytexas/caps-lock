export const config = { runtime: "edge" };

// Küçük yardımcı: boolean param parse
const parseBool = (sp, key, def = false) => {
  const v = sp.get(key);
  if (v == null) return def;
  return v === "1" || v.toLowerCase() === "true";
};

export default async function handler(req) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const text = sp.get("text") ?? sp.get("kelime") ?? "";
  if (!text) {
    return new Response(JSON.stringify({ error: "text (veya kelime) parametresi gerekli" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const threshold = Math.min(1, Math.max(0, parseFloat(sp.get("threshold") ?? "0.7"))); // %70 default
  const minLen = parseInt(sp.get("minlen") ?? "8", 10); // min uzunluk
  const minCaps = parseInt(sp.get("mincaps") ?? "6", 10); // min büyük harf sayısı
  const ignoreMentions = parseBool(sp, "ignore_mentions", true);
  const ignoreUrls = parseBool(sp, "ignore_urls", true);

  // Metni temizle
  let t = text;
  if (ignoreMentions) t = t.replace(/(@\w+|#\w+)/g, "");
  if (ignoreUrls) t = t.replace(/https?:\/\/\S+|www\.\S+/gi, "");

  // Harfler
  const letters = (t.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) || []);
  const upperCount = letters.filter(
    (ch) => ch === ch.toLocaleUpperCase("tr") && ch !== ch.toLocaleLowerCase("tr")
  ).length;
  const letterCount = letters.length;
  const ratio = letterCount ? upperCount / letterCount : 0;

  // ALL-CAPS kelimeler
  const capsWords =
    t.match(/\b[A-ZÇĞİÖŞÜ]{2,}\b/g)?.filter((w) => !/^\d+$/.test(w)) ?? [];

  // Uyarı koşulu
  const isShouting =
    (t.length >= minLen && upperCount >= minCaps && ratio >= threshold) ||
    capsWords.length >= 2;

  return new Response(
    JSON.stringify({
      ok: true,
      isShouting,
      ratio: Number(ratio.toFixed(3)),
      upperCount,
      letterCount,
      capsWords,
      text,
    }, null, 2),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
