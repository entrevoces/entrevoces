/** Deterministic diversity brief: editorial constraints, never demographic assumptions. */
import {createHash} from 'node:crypto';
const SETTINGS=[
 {setting:'an independent late-night community radio booth',sound:'phone-line click, breathing room tone, out-of-tune station ident',tension:'a public correction threatens the host’s credibility'},
 {setting:'an intercity bus terminal during a rainstorm',sound:'receding bus brakes, zipper, rain on shelter glass',tension:'a misheard date threatens someone’s carefully saved travel plan'},
 {setting:'a small neighborhood print shop at closing time',sound:'slow photocopier drum, paper cutter, shop bell',tension:'a printed claim is repeated as if it were official approval'},
 {setting:'a community theater rehearsing a one-night show',sound:'footsteps on empty stage, distant curtain pulley, rehearsal clap',tension:'the performer must reveal a mistake without ruining the show'},
 {setting:'a public library book club after an unexpected blackout',sound:'paper pages, emergency lamp click, distant thunder',tension:'one borrowed story has acquired an extra witness'},
 {setting:'a sewing-machine repair studio beside a bakery',sound:'wheel turning by hand, bakery tins, kettle whistle',tension:'a conditional promise is mistaken for an agreement'},
 {setting:'a rooftop garden shared by unlikely neighbors',sound:'wind in bamboo stakes, watering can, distant city buses',tension:'an unreliable account threatens a friendship'},
 {setting:'a harbor-side diner after the breakfast rush',sound:'cutlery settling, coffee grinder, passing ferry horn',tension:'a person must decide whether to disclose a misunderstanding'},
];
const LENSES=[
 {tone:'warm ensemble comedy with a melancholy undertow',comic:'understated conversational reversals and long affectionate pauses'},
 {tone:'noir mystery that resolves through what was actually said',comic:'deadpan sensory detail, not eccentric caricatures'},
 {tone:'small domestic adventure with quiet stakes',comic:'a callback object changes meaning late in the scene'},
 {tone:'fast, humane call-in radio with competing interpretations',comic:'a spirited host and an unexpectedly precise caller'},
 {tone:'soft speculative fiction grounded in real human choices',comic:'one absurd rule is treated with ordinary practicality'},
 {tone:'tender intergenerational dramedy about autonomy',comic:'warm self-deprecation and conflicting sensible plans'},
];
const MUSICS=[
 {genre:'intimate bolero with brushed percussion and nylon guitar',hook:'a chorus that adds one twist on its second repetition'},
 {genre:'dancing Cuban son with tres and acoustic bass',hook:'spoken pickup and antiphonal response without a novelty voice'},
 {genre:'witty milonga with bandoneon and subtle piano',hook:'instrumental stop-time around the semantic pivot'},
 {genre:'warm contemporary chamber-pop with intimate alto and strings',hook:'sparse verse followed by a surprising harmonic release'},
 {genre:'soft cumbia with live hand percussion and bright bass',hook:'a conversational hook with clear rhythmically stressed numbers'},
 {genre:'Latin folk song with a small, human choir',hook:'the last verse changes the emotional reading of the first'},
];
const index=(id,n,salt)=>parseInt(createHash('sha256').update(id+':'+salt).digest('hex').slice(0,8),16)%n;
export function creativeDNA({id,kind,topic,domain}={}){
 if(!id||!kind||!topic||!domain)throw Error('Creative DNA requires a stable complete source brief');
 const location=SETTINGS[index(id,SETTINGS.length,'place')],lens=LENSES[index(id,LENSES.length,'lens')],music=MUSICS[index(id,MUSICS.length,'music')];
 return {version:1,world:location.setting,soundscape:location.sound,stakes:location.tension,tone:lens.tone,comicRhythm:lens.comic,
  music:kind==='song'?music.genre:'acoustic score only where it advances emotion',musicalHook:kind==='song'?music.hook:'use near-silence rather than constant underscores',
  choiceProblem:`How a subtle ${topic} distinction changes a credible ${domain} situation`,
  emotionalTurn:'An initially sensible choice has a cost; the ending resolves that cost without sermonizing',
  adultAudience:'Curious adult learner, no stereotype-based personalization',
  noCopying:'Original roles, scene order, exact dialogue, lyric melody and production identity; never mimic a named living performer'};
}
