// /element — periodic table element lookup by symbol, name, or atomic number
const E = [
  ['H','Hydrogen',1,1.008,'nonmetal','−1,+1'],['He','Helium',2,4.0026,'noble gas','0'],
  ['Li','Lithium',3,6.94,'alkali metal','+1'],['Be','Beryllium',4,9.0122,'alkaline earth metal','+2'],
  ['B','Boron',5,10.81,'metalloid','+3'],['C','Carbon',6,12.011,'nonmetal','−4,+2,+4'],
  ['N','Nitrogen',7,14.007,'nonmetal','−3,+3,+5'],['O','Oxygen',8,15.999,'nonmetal','−2'],
  ['F','Fluorine',9,18.998,'halogen','−1'],['Ne','Neon',10,20.180,'noble gas','0'],
  ['Na','Sodium',11,22.990,'alkali metal','+1'],['Mg','Magnesium',12,24.305,'alkaline earth metal','+2'],
  ['Al','Aluminium',13,26.982,'post-transition metal','+3'],['Si','Silicon',14,28.085,'metalloid','−4,+4'],
  ['P','Phosphorus',15,30.974,'nonmetal','−3,+3,+5'],['S','Sulfur',16,32.06,'nonmetal','−2,+4,+6'],
  ['Cl','Chlorine',17,35.45,'halogen','−1'],['Ar','Argon',18,39.95,'noble gas','0'],
  ['K','Potassium',19,39.098,'alkali metal','+1'],['Ca','Calcium',20,40.078,'alkaline earth metal','+2'],
  ['Ti','Titanium',22,47.867,'transition metal','+2,+3,+4'],['Cr','Chromium',24,51.996,'transition metal','+2,+3,+6'],
  ['Mn','Manganese',25,54.938,'transition metal','+2,+4,+7'],['Fe','Iron',26,55.845,'transition metal','+2,+3'],
  ['Ni','Nickel',28,58.693,'transition metal','+2'],['Cu','Copper',29,63.546,'transition metal','+1,+2'],
  ['Zn','Zinc',30,65.38,'transition metal','+2'],['Ag','Silver',47,107.87,'transition metal','+1'],
  ['Sn','Tin',50,118.71,'post-transition metal','+2,+4'],['I','Iodine',53,126.90,'halogen','−1,+1,+5,+7'],
  ['Xe','Xenon',54,131.29,'noble gas','0'],['Pt','Platinum',78,195.08,'transition metal','+2,+4'],
  ['Au','Gold',79,196.97,'transition metal','+1,+3'],['Hg','Mercury',80,200.59,'transition metal','+1,+2'],
  ['Pb','Lead',82,207.2,'post-transition metal','+2,+4'],['U','Uranium',92,238.03,'actinide','+3,+4,+6'],
];
const bySym = {}; E.forEach(e => bySym[e[0].toLowerCase()] = e);

function routeElement(u, res, json) {
  const p = u.searchParams;
  const q = (p.get('q') || p.get('symbol') || p.get('name') || p.get('number') || '').trim();
  if (!q) return json(res, 200, { usage: '?q=Fe (symbol) | ?q=iron (name) | ?q=26 (number)', total: E.length });
  let found = bySym[q.toLowerCase()];
  if (!found) found = E.find(e => e[1].toLowerCase() === q.toLowerCase() || String(e[2]) === q);
  if (!found) return json(res, 404, { error: 'element not found', query: q });
  return json(res, 200, { symbol: found[0], name: found[1], atomic_number: found[2], atomic_mass: found[3], category: found[4], oxidation_states: found[5] });
}
module.exports = { routeElement };
