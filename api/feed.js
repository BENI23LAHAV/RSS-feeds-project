export default async function handler(req, res) {
  const { channel, before } = req.query;

  if (!channel) {
    return res.status(400).json({ error: "חסר שם ערוץ" });
  }

  try {
    // הכתובת המקורית של טלגרם שאנחנו רוצים להגיע אליה
    const targetUrl = before
      ? `https://t.me/s/${channel}?before=${before}`
      : `https://t.me/s/${channel}`;

    // ======= הפתרון: שימוש בשירות פרוקסי שעוקף את החסימה =======
    // אנחנו עוטפים את הקישור של טלגרם בתוך הקישור של שירות הפרוקסי
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    // הפרוקסי מחזיר לנו את כל קוד האתר של טלגרם בתוך משתנה שנקרא contents
    const html = data.contents;

    if (!html) {
      return res.status(500).json({ error: "הפרוקסי החזיר תשובה ריקה" });
    }
    // ==========================================================

    const items = [];
    let oldestId = null;

    const messageBlocks = html.split("tgme_widget_message_wrap").slice(1);

    messageBlocks.forEach((block) => {
      let idMatch = block.match(/data-post="[^/]+\/(\d+)"/);
      if (idMatch) {
        const currentId = parseInt(idMatch[1]);
        if (!oldestId || currentId < oldestId) {
          oldestId = currentId; 
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

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    res.status(200).json({ items: items.reverse(), nextOffset: oldestId });
    
  } catch (error) {
    res.status(500).json({ error: "שגיאה בתקשורת עם הפרוקסי או טלגרם" });
  }
}