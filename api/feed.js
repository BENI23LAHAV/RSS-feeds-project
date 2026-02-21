export default async function handler(req, res) {
  // מקבלים את כתובת ה-RSS הספציפית מהבקשה של הדפדפן
  const { rss_url } = req.query;

  if (!rss_url) {
    return res.status(400).json({ error: "חסר קישור לערוץ" });
  }

  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss_url)}&count=30`;
  try {
    const fetchResponse = await fetch(apiUrl);
    const data = await fetchResponse.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "שגיאה במשיכת הנתונים" });
  }
}
