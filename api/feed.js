export default async function handler(req, res) {
  const { channel } = req.query;

  if (!channel) {
    return res.status(400).json({ error: "חסר שם ערוץ" });
  }

  try {
    // Vercel פונה ישירות לטלגרם, ללא שום שירותי RSS מתווכים
    const response = await fetch(`https://t.me/s/${channel}`);
    const html = await response.text();

    const items = [];

    // חיתוך הדף לבלוקים של הודעות
    const messageBlocks = html.split("tgme_widget_message_wrap").slice(1);

    messageBlocks.forEach((block) => {
      // חילוץ הטקסט של ההודעה
      let textMatch = block.match(
        /<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/,
      );
      let text = textMatch ? textMatch[1] : "";

      // חילוץ תמונות (אם מצורפות להודעה)
      let imgMatch = block.match(/background-image:url\('([^']+)'\)/);
      let img = imgMatch
        ? `<div style="margin-top:10px;"><img src="${imgMatch[1]}" style="max-width:100%; border-radius:8px;"></div>`
        : "";

      // חילוץ תאריך
      let dateMatch = block.match(/<time datetime="([^"]+)"/);
      let date = dateMatch ? dateMatch[1] : new Date().toISOString();

      if (text || img) {
        items.push({
          description: text + img,
          pubDate: date,
        });
      }
    });

    // טלגרם מציג את הישנים למעלה, אז אנחנו הופכים את הסדר כדי שהחדש יהיה ראשון
    res.status(200).json({ items: items.reverse() });
  } catch (error) {
    res.status(500).json({ error: "שגיאה במשיכת הנתונים ישירות מטלגרם" });
  }
}
