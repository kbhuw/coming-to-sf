import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from collect_parks import parse
class ParksTests(unittest.TestCase):
 def test_completed_cards_and_nested_group(self):
  template='<div class="widgetPages"><li data-pageid="1"><div class="widgetTitle"><a href="/1/Park">A Park</a></div><p class="widgetDesc">%s</p></li></div>'
  self.assertTrue(parse(template%'Completed August 2026. Renovation.')[0]['completed'])
  self.assertTrue(parse(template%'Active projects in Golden Gate Park.')[0]['group'])
  self.assertFalse(parse(template%'Renovation is planned.')[0]['completed'])
 def test_unrelated_page_navigation_is_excluded(self):
  self.assertEqual(parse('<li data-pageid="1"><a href="/1/Park">Nav</a></li>'),[])
if __name__=='__main__':unittest.main()
