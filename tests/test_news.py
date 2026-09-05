import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from collect_news import parse,canonical
class NewsTests(unittest.TestCase):
 def test_rss_and_atom_keep_headlines_and_dates(self):
  rss='<rss><channel><item><title>A new café</title><link>https://example.com/a?utm_source=x</link><pubDate>Fri, 04 Sep 2026 12:00:00 +0000</pubDate></item></channel></rss>'
  atom='<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>A new café</title><link rel="alternate" href="https://example.com/a"/><published>2026-09-04T12:00:00Z</published></entry></feed>'
  self.assertEqual(parse(rss),parse(atom))
 def test_unsafe_links_and_empty_feed_fail(self):
  with self.assertRaises(ValueError):canonical('javascript:alert(1)')
  with self.assertRaises(ValueError):parse('<rss><channel/></rss>')
 def test_missing_date_does_not_become_today(self):
  self.assertIsNone(parse('<rss><channel><item><title>T</title><link>https://example.com/a</link></item></channel></rss>')[0]['publishedAt'])
if __name__=='__main__':unittest.main()
