import { readFileSync, writeFileSync } from "node:fs";

const FEED_URL = "https://nathanatherton.com/feed.xml";
const README = new URL("../README.md", import.meta.url);
const START = "<!-- LATEST-WRITING:START -->";
const END = "<!-- LATEST-WRITING:END -->";

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const res = await fetch(FEED_URL);
if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
const xml = await res.text();

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map(([, item]) => {
    const get = (tag) =>
      (item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) ?? [])[1];
    return { title: get("title"), link: get("link"), pubDate: get("pubDate") };
  })
  .filter((p) => p.title && p.link && p.pubDate)
  .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
  .slice(0, 5);

if (items.length === 0) throw new Error("No items parsed from feed");

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

const lines = items
  .map((p) => `- [${decode(p.title).trim()}](${p.link.trim()}) — ${fmt(p.pubDate)}`)
  .join("\n");

const readme = readFileSync(README, "utf8");
if (!readme.includes(START) || !readme.includes(END))
  throw new Error("README markers not found");

const updated = readme.replace(
  new RegExp(`${START}[\\s\\S]*?${END}`),
  `${START}\n${lines}\n${END}`
);

if (updated !== readme) {
  writeFileSync(README, updated);
  console.log("README updated");
} else {
  console.log("No changes");
}
