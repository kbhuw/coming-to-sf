import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from arrival_ranges import completion_range
class CompletionTests(unittest.TestCase):
 def test_month_and_season(self):
  self.assertEqual(completion_range('November 2026','source')['end'],'2026-11-30')
  self.assertEqual(completion_range('Fall 2026','source')['start'],'2026-09-01')
 def test_ambiguous_and_duration_not_promoted(self):
  for label in ['Winter 2026','4 years','Late 2026/Early 2027','TBD']:self.assertIsNone(completion_range(label,'source'))
 def test_end_of_year_remains_broad(self):
  self.assertEqual(completion_range('End of 2026','source')['start'],'2026-01-01')
if __name__=='__main__':unittest.main()
