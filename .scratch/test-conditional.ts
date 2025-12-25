import { compile } from './src/compiler';

const dsl = `@tab Cn ^r [ Bt "Overview" >tab=0 Bt "Charts" >tab=1 ] ?@tab=0 Kp :summary ?@tab=1 Ln :monthly`;

const result = compile(dsl);
console.log("Blocks:");
console.log(JSON.stringify(result.blocks, null, 2));
