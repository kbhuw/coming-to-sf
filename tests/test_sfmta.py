"""Parser contract tests: project cards only, safe pagination and missing-title failure."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from collect_sfmta import parse,DIRECTORY
class DirectoryTests(unittest.TestCase):
 def test_cards_exclude_navigation_and_keep_completed_filter(self):
  html='''<a href="/projects/project-reports">Navigation</a><article class="node--type-project node--view-mode-grid"><h3><a href="/projects/example">Example &amp; street</a></h3><div class="field--name-field-teaser-text">A street improvement.</div></article><li class="pager__item--next"><a href="?field_project_status_value=Completed&amp;page=1">Next</a></li>'''
  rows,nxt=parse(html,DIRECTORY)
  self.assertEqual(len(rows),1)
  self.assertEqual(rows[0]['name'],'Example & street')
  self.assertEqual(nxt,DIRECTORY+'?field_project_status_value=Completed&page=1')
 def test_broken_card_fails_instead_of_silently_dropping_it(self):
  with self.assertRaises(ValueError):parse('<article class="node--type-project node--view-mode-grid"></article>',DIRECTORY)
 def test_final_page_has_no_next(self):
  self.assertEqual(parse('<div>End</div>',DIRECTORY),([],None))
if __name__=='__main__':unittest.main()
