import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to analyze a URL
  app.post("/api/analyze", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Detection Logic: <a href="#..."> (Internal anchor links)
      const internalLinks = $('a[href^="#"]').filter((i, el) => {
        const href = $(el).attr('href');
        return href && href.length > 1;
      });

      const hasToC = internalLinks.length > 0;
      let details = null;

      if (hasToC) {
        // Keywords: Check if anchor text is descriptive (e.g., > 2 words)
        const descriptiveText = internalLinks.toArray().some(el => {
          const text = $(el).text().trim();
          return text.split(/\s+/).length >= 3;
        });

        const hasH2 = $('h2').length > 0;
        const hasH3 = $('h3').length > 0;
        const nestingOk = hasH2 && hasH3;

        details = {
          keywords: { 
            status: descriptiveText, 
            label: "Keywords", 
            value: "Use descriptive, keyword-rich headings.",
            why: "Tells SEO/AI exactly what each section covers."
          },
          nesting: { 
            status: nestingOk, 
            label: "Nesting", 
            value: "Use H2 and H3 hierarchy.",
            why: "Shows the relationship between sub-topics."
          }
        };
      }

      // List Detection Logic
      const liElements = $('li');
      const liCount = liElements.length;
      const ulCount = $('ul').length;
      const olCount = $('ol').length;

      const listAnalysis = {
        isPresent: liCount > 0,
        isStandard: liCount > 0 && (liElements.closest('ul').length > 0 || liElements.closest('ol').length > 0)
      };

      // FAQ Detection Logic
      // Look for text like "FAQ" or "Frequently Asked Questions" in headings or common container classes
      const faqKeywords = ['faq', 'frequently asked questions', 'häufig gestellte fragen', 'fragen & antworten'];
      const hasFAQ = $('h1, h2, h3, h4, h5, h6, span, div, section').toArray().some(el => {
        const text = $(el).text().toLowerCase().trim();
        return faqKeywords.some(keyword => text.includes(keyword));
      });

      res.json({ url, hasToC, details, listAnalysis, hasFAQ });
    } catch (error: any) {
      console.error(`Error analyzing ${url}:`, error.message);
      res.status(500).json({ url, error: error.message, hasToC: false });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
