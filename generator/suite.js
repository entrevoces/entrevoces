// Portfolio contract: complementary games share knowledge and progression,
// while owning measurably different decisions and learning responsibilities.
export function validateSuite(plan,{concepts=[]}={}){
 const errors=[],add=(field,message)=>errors.push({field,message}),games=Array.isArray(plan?.games)?plan.games:[],known=new Set(concepts.map(c=>`${c.domainId}:${c.conceptId}`));
 if(typeof plan?.vision!=='string'||plan.vision.length<120)add('vision','A substantive interpreting-centered suite vision is required.');
 if(games.length!==5)add('games','Exactly five complementary games required.');
 const ids=new Set(),verbs=new Set(),loops=new Set();
 for(const[gIndex,g]of games.entries()){
  const field=`games[${gIndex}]`;
  if(!/^[a-z0-9][a-z0-9-]{2,48}$/.test(g?.gameId)||ids.has(g.gameId))add(field,'Unique stable gameId required.');ids.add(g?.gameId);
  for(const k of ['name','primaryVerb','decisionTopology','learningResponsibility','experience','visualDirection','handoff','distinctness'])if(typeof g?.[k]!=='string'||g[k].trim().length<(k==='name'?3:40))add(`${field}.${k}`,'Substantive concrete design required.');
  const verb=g?.primaryVerb?.toLowerCase().trim(),loop=g?.decisionTopology?.toLowerCase().trim();if(verbs.has(verb)||loops.has(loop))add(field,'Different names or themes do not establish a distinct decision problem.');verbs.add(verb);loops.add(loop);
  if(!Array.isArray(g?.concepts)||!g.concepts.length||g.concepts.some(c=>!known.has(`${c.domainId}:${c.conceptId}`)))add(field,'Use known domain-qualified knowledge.');
  if(!Array.isArray(g?.stages)||!g.stages.length||g.stages.some(s=>!Number.isInteger(s)||s<1||s>8))add(field,'Actual evidence stages required.');
  if(!Array.isArray(g?.prerequisiteGameIds)||g.prerequisiteGameIds.some(id=>!ids.has(id)||id===g.gameId))add(field,'Prerequisites must point to earlier games, never self or future games.');
  if(gIndex>0&&!g?.prerequisiteGameIds?.length)add(field,'Later games must identify the earlier skill they build upon.');
 }
 return{ok:!errors.length,errors};
}
export const SUITE_PROMPT=`Create exactly FIVE distinct, sophisticated interpreting games as a complementary curriculum and a coherent collection. Interpreting and carrying meaning are the central principles. Reuse the supplied knowledge; extend practice contexts and skills through clearly labeled synthetic situations. Do not turn the suite into credential trivia or jurisdiction memorization. Do not invent authoritative clinical/legal facts or translations. Source legitimacy is not a prestige gate for practice; truthfulness and clear synthetic/source boundaries remain essential.
Explore the broad design space of contemporary systemic games: traversal, construction, simulation, logistics, deduction, tactical planning, rhythm/listening, living conversations and other appropriate forms. Compare candidates by actual primary verb, decision topology, strategy, failure/recovery, learning evidence and first/full/repeated sessions. Take lessons from modern game depth and feel without copying distinctive expression, protected characters or commercial art. No five reskinned quizzes, text desks, flashcard boards or answer-label dragging. Player input must change a spatial/systemic world with audiovisual feedback and a consequential next choice.
The first game develops a foundational responsibility. Each next game adds a distinct interpreting capability and demonstrably reuses earlier skills; later games integrate them in meaningful encounters. Knowledge difficulty is shared deterministic code. Games remain independently explorable in a local experiment collection; prerequisite relationships guide learning rather than dead-locking the author from testing.
Return {vision,progressionRationale,games:[{gameId,name,primaryVerb,decisionTopology,learningResponsibility,experience,visualDirection,handoff,distinctness,concepts:[{domainId,conceptId}],stages:[1..8],prerequisiteGameIds:[]}]}. Concrete prose fields other than name require >=40 characters. Domain-qualified concepts must exist in supplied knowledge. Prerequisites point only to earlier games. Describe why every pair differs in play, not merely theme. The handoff is the specific interpreting skill this game prepares for the next game. This is suite planning; each game still needs its saved full framework, four adversarial gates, assets, implementation and observed play before publication.`;
