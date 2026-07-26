export default async function handler(req, res) {
  const { channel, before } = req.query;

  if (!channel) {
    return res.status(400).json({ error: "חסר שם ערוץ" });
  }

  try {
    const url = before
      ? `https://t.me/s/${channel}?before=${before}`
      : `https://t.me/s/${channel}`;
      
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
    });
    
    const html = await response.text();

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

      let textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      let text = textMatch ? textMatch[1] : "";

      // חילוץ כל התמונות
      let images = [];
      let imgRegex = /background-image:url\('([^']+)'\)/g;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(block)) !== null) {
          images.push(imgMatch[1]);
      }

      // חילוץ כל הסרטונים
      let videos = [];
      let vidRegex = /<video[^>]*src="([^"]+)"/g;
      let vidMatch;
      while ((vidMatch = vidRegex.exec(block)) !== null) {
          videos.push(vidMatch[1]);
      }

      let dateMatch = block.match(/<time datetime="([^"]+)"/);
      let date = dateMatch ? dateMatch[1] : new Date().toISOString();

      if (text || images.length > 0 || videos.length > 0) {
        items.push({
          text: text,
          images: images,
          videos: videos,
          pubDate: date,
        });
      }
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    res.status(200).json({ items: items.reverse(), nextOffset: oldestId });

  } catch (error) {
    res.status(500).json({ error: "שגיאה במשיכת הנתונים ישירות מטלגרם" });
  }
}