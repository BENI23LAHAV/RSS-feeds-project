export default async function handler(req, res) {
  // עכשיו השרת יודע לקבל גם פרמטר "before" כדי לטעון היסטוריה אחורה
  const { channel, before } = req.query;

  if (!channel) {
    return res.status(400).json({ error: "חסר שם ערוץ" });
  }

  try {
    const url = before
      ? `https://t.me/s/${channel}?before=${before}`
      : `https://t.me/s/${channel}`;
    const response = await fetch(url);
    const html = await response.text();

    const items = [];
    let oldestId = null;

    const messageBlocks = html.split("tgme_widget_message_wrap").slice(1);

    messageBlocks.forEach((block) => {
      // חילוץ מזהה ההודעה כדי שנדע מאיפה להמשיך לטעון בפעם הבאה
      let idMatch = block.match(/data-post="[^/]+\/(\d+)"/);
      if (idMatch) {
        const currentId = parseInt(idMatch[1]);
        if (!oldestId || currentId < oldestId) {
          oldestId = currentId; // שומרים את ה-ID הכי קטן (הכי ישן)
        }
      }

      let textMatch = block.match(
        /<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/,
      );
      let text = textMatch ? textMatch[1] : "";

      let imgMatch = block.match(/background-image:url\('([^']+)'\)/);
      let img = imgMatch
        ? `<div style="margin-top:10px;"><img src="${imgMatch[1]}" style="max-width:100%; border-radius:8px;"></div>`
        : "";

      // חדש: חילוץ סרטונים!
      let videoMatch = block.match(/<video[^>]*src="([^"]+)"/);
      let video = videoMatch
        ? `<div style="margin-top:10px;"><video src="${videoMatch[1]}" controls style="max-width:100%; border-radius:8px; background: #000;"></video></div>`
        : "";

      let dateMatch = block.match(/<time datetime="([^"]+)"/);
      let date = dateMatch ? dateMatch[1] : new Date().toISOString();

      if (text || img || video) {
        items.push({
          description: text + img + video,
          pubDate: date,
        });
      }
    });

    // פותר את בעיית האיטיות: שומר בזיכרון (Cache) למשך 60 שניות
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");

    res.status(200).json({ items: items.reverse(), nextOffset: oldestId });
  } catch (error) {
    // ... המשך הקוד ...
    res.status(500).json({ error: "שגיאה במשיכת הנתונים ישירות מטלגרם" });
  }
}
