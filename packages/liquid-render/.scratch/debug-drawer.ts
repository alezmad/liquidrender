import { parseUI } from '../src/compiler/compiler';

const input1 = `Bt "Open" >menu
Dw "Menu" <menu [Tx "Content"]`;

const schema1 = parseUI(input1);
console.log('Test 1: Button + Drawer');
console.log('Layers:', schema1.layers.length);
schema1.layers.forEach((l, i) => {
  console.log(`Layer ${i}: type=${l.root.type}, signals=`, l.root.signals);
  if (l.root.children) {
    console.log(`  Children (${l.root.children.length}):`);
    l.root.children.forEach((c, ci) => {
      console.log(`    Child ${ci}: type=${c.type}, signals=`, c.signals);
    });
  }
});
console.log('\n');

const input2 = `Bt "Open Drawer" >drawer
Dw "Side Panel" <drawer [
  Tx "Panel content",
  Bt "Action"
]`;

const schema2 = parseUI(input2);
console.log('Test 2: Complex Drawer Flow');
console.log('Layers:', schema2.layers.length);
schema2.layers.forEach((l, i) => {
  console.log(`Layer ${i}: type=${l.root.type}, signals=`, l.root.signals);
  if (l.root.children) {
    console.log(`  Children (${l.root.children.length}):`);
    l.root.children.forEach((c, ci) => {
      console.log(`    Child ${ci}: type=${c.type}, signals=`, c.signals);
    });
  }
});
