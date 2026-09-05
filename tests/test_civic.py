import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from collect_civic import port_links,school_links
class CivicTests(unittest.TestCase):
 def test_port_requires_development_section_and_preserves_unknown_completion(self):
  html='''<div class="view-id-projects">Projects In Development<article class="node--type-project"><div onclick="window.location.href='/project'"><h3 class="card-title">Pier work</h3></div></article></div>'''
  row=port_links(html)[0]
  self.assertEqual(row['url'],'https://www.sfport.com/project')
  self.assertIsNone(row['completed'])
  with self.assertRaises(ValueError):port_links('<div>Completed Projects</div>')
 def test_school_leaf_pages_exclude_parent_navigation(self):
  html='<ul class="hero-mobile-nav"><li><a href="/program">Program</a><ul><li><a href="/school">School</a></li></ul></li></ul><nav><a href="/other">Other navigation</a></nav>'
  rows=school_links(html,'https://www.sfusd.edu/bond')
  self.assertEqual([r['name'] for r in rows],['School'])
  self.assertIsNone(rows[0]['completed'])
  with self.assertRaises(ValueError):school_links('<html/>','https://www.sfusd.edu/bond')
if __name__=='__main__':unittest.main()
