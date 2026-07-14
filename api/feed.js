export default async function handler(req, res) {
  const { channel } = req.query;

  if (!channel) {
    return res.status(400).json({ error: "חסר שם ערוץ" });
  }

  try {
    // רשימה של שרתי גיבוי פרטיים (RSSHub) שיודעים להחזיר JSON נקי
    // השרת שלנו ידלג ביניהם עד שימצא אחד פנוי שלא נחסם על ידי טלגרם
    const instances = [
      `https://rsshub.rssforever.com/telegram/channel/${channel}?format=json`,
      `https://rsshub.mxd.kro.kr/telegram/channel/${channel}?format=json`,
      `https://hub.slarker.me/telegram/channel/${channel}?format=json`,
    ];

    let data = null;

    // לולאה שמנסה כל שרת בתורו
    for (let url of instances) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
        });

        if (response.ok) {
          data = await response.json();
          break; // ברגע ששרת אחד ענה בהצלחה, יוצאים מהלולאה!
        }
      } catch (e) {
        continue; // אם השרת נכשל, ממשיכים אוטומטית לשרת הבא
      }
    }

    // אם כל השרתים נכשלו או החזירו תשובה ריקה
    if (!data || !data.items || data.items.length === 0) {
      return res.status(200).json({ items: [], nextOffset: null });
    }

    // סידור הנתונים לפורמט שהעיצוב שלנו (HTML) מכיר
    const items = data.items.map((item) => {
      return {
        description: item.content_html || item.title || "",
        pubDate: item.date_published,
      };
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");

    // מחזירים את התשובה (ללא מזהה להיסטוריה, כי השרתים האלו נותנים רק חדשים)
    res.status(200).json({ items: items, nextOffset: null });
  } catch (error) {
    res.status(500).json({ error: "שגיאה כללית במשיכת הנתונים" });
  }
}
