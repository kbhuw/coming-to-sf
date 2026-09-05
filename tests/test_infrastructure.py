import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from collect_infrastructure import pw_records,puc_links
class InfrastructureTests(unittest.TestCase):
 def test_blank_map_status_does_not_steal_next_marker(self):
  directory='<div class="project-item"><div class="project in-progress" data-history-node-id="1"><div class="portfolio-title"><a href="/one">One</a></div></div></div>'
  marker=lambda id,lat,status:f'var marker = L.marker([{lat} , -122.4]).addTo(mymap); marker.bindPopup("<h2>Place {id}</h2>"); if({id} == nodeID){{}} markers.push([m, {status}, []]);'
  rows,count=pw_records(directory,marker(1,37.75,'')+marker(2,37.78,'1'))
  self.assertEqual(count,2);self.assertEqual(rows[0]['coordinates'],[-122.4,37.75]);self.assertEqual(rows[1]['coordinates'],[-122.4,37.78]);self.assertTrue(rows[1]['completed'])
 def test_puc_regions_stay_separate(self):
  group=lambda name,path:f'<div class="accordion-item"><a class="accordion-title">{name}</a><div class="accordion-content"><a href="/{path}">{path}</a></div></div>'
  rows=puc_links(group('East Bay','outside')+group('San Francisco','inside'))
  self.assertEqual([x['name'] for x in rows],['inside'])
if __name__=='__main__':unittest.main()
