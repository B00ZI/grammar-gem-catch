/**
 * questions.js — the educational content.
 *
 * 120 gentle sentences in 5 difficulty tiers. This is a learning game
 * first: English stays simple and clear everywhere; difficulty grows
 * slowly through *word set* and *sentence shape*, never through
 * complicated grammar.
 *
 * Each question names its "owner" (the subject the possessive must
 * agree with) so the quiz is unambiguous: owner "They" → answer
 * "their". The blank is always immediately before the owned noun.
 *
 * Tier → level gating:
 *   Tier 1 → Level 1      my / your / our / their, owner first, very short
 *   Tier 2 → Level 2      same four words, longer sentences
 *   Tier 3 → Level 3      adds his / her / its (new words to learn)
 *   Tier 4 → Level 4      names (David → his), owner in the middle
 *   Tier 5 → Level 5+     all mixed, hardest (but still gentle) shapes
 *
 * Level N draws from tiers 1..N. 120 questions with no repeats inside
 * a run = up to 15 full levels of fresh content.
 */

const make = (id, owner, answer, sentence, level = 1, hint = '') =>
  ({ id, owner, answer, sentence, level, hint });

export const QUESTIONS = [
  /* ---------- Tier 1 (Level 1): the core four, owner first, short ---------- */
  // my — "I"
  make('t1-01', 'I', 'my', 'I packed ___ lunch for school.', 1, '“I” always goes with “my”.'),
  make('t1-02', 'I', 'my', 'I love ___ new bicycle.', 1, '“I” → “my”.'),
  make('t1-03', 'I', 'my', 'I forgot ___ umbrella at home.', 1, '“I” → “my”.'),
  make('t1-04', 'I', 'my', 'I brush ___ teeth every morning.', 1, '“I” → “my”.'),
  make('t1-05', 'I', 'my', 'I finished ___ homework early.', 1, '“I” → “my”.'),
  make('t1-06', 'I', 'my', 'I put on ___ warm jacket.', 1, '“I” → “my”.'),
  // your — "You"
  make('t1-07', 'You', 'your', 'You left ___ keys on the table.', 1, '“You” → “your”.'),
  make('t1-08', 'You', 'your', 'You tied ___ shoes all by yourself.', 1, '“You” → “your”.'),
  make('t1-09', 'You', 'your', 'You forgot ___ library book again.', 1, '“You” → “your”.'),
  make('t1-10', 'You', 'your', 'You can bring ___ friend to the party.', 1, '“You” → “your”.'),
  make('t1-11', 'You', 'your', 'You found ___ lost pencil under the desk.', 1, '“You” → “your”.'),
  make('t1-12', 'You', 'your', 'You made ___ sandwich for lunch.', 1, '“You” → “your”.'),
  // our — "We"
  make('t1-13', 'We', 'our', 'We planted ___ new tree in the garden.', 1, '“We” → “our”.'),
  make('t1-14', 'We', 'our', 'We cleaned ___ classroom after lunch.', 1, '“We” → “our”.'),
  make('t1-15', 'We', 'our', 'We forgot ___ picnic blanket at home.', 1, '“We” → “our”.'),
  make('t1-16', 'We', 'our', 'We are proud of ___ school.', 1, '“We” → “our”.'),
  make('t1-17', 'We', 'our', 'We decorated ___ kitchen together.', 1, '“We” → “our”.'),
  make('t1-18', 'We', 'our', 'We saved ___ old toys for the donation.', 1, '“We” → “our”.'),
  // their — "They"
  make('t1-19', 'They', 'their', 'They built ___ sandcastle by the sea.', 1, '“They” → “their”.'),
  make('t1-20', 'They', 'their', 'They left ___ bikes in the yard.', 1, '“They” → “their”.'),
  make('t1-21', 'They', 'their', 'They adopted ___ puppy from the shelter.', 1, '“They” → “their”.'),
  make('t1-22', 'They', 'their', 'They hung ___ coats on the hooks.', 1, '“They” → “their”.'),
  make('t1-23', 'They', 'their', 'They love ___ grandmother’s cookies.', 1, '“They” → “their”.'),
  make('t1-24', 'They', 'their', 'They finished ___ puzzle in ten minutes.', 1, '“They” → “their”.'),

  /* ---------- Tier 2 (Level 2): same four words, longer sentences ---------- */
  make('t2-01', 'I', 'my', 'I hung ___ wet coat on the hook by the door.', 2, 'Still “I” → “my”, just longer.'),
  make('t2-02', 'I', 'my', 'I keep ___ favorite book under the pillow.', 2, '“I” → “my”.'),
  make('t2-03', 'I', 'my', 'I took ___ swimming goggles to the pool.', 2, '“I” → “my”.'),
  make('t2-04', 'I', 'my', 'I found ___ old toy in the attic yesterday.', 2, '“I” → “my”.'),
  make('t2-05', 'I', 'my', 'I carried ___ heavy backpack up the hill.', 2, '“I” → “my”.'),
  make('t2-06', 'I', 'my', 'I wrote ___ name on the paper.', 2, '“I” → “my”.'),
  make('t2-07', 'You', 'your', 'You should put ___ clean socks in the drawer.', 2, '“You” → “your”.'),
  make('t2-08', 'You', 'your', 'You left ___ science project on the bus.', 2, '“You” → “your”.'),
  make('t2-09', 'You', 'your', 'You can invite ___ cousins to the party.', 2, '“You” → “your”.'),
  make('t2-10', 'You', 'your', 'You wore ___ lucky hat to the game.', 2, '“You” → “your”.'),
  make('t2-11', 'You', 'your', 'You read ___ favorite story to me.', 2, '“You” → “your”.'),
  make('t2-12', 'You', 'your', 'You should close ___ bedroom window.', 2, '“You” → “your”.'),
  make('t2-13', 'We', 'our', 'We named ___ new hamster Sparky.', 2, '“We” → “our”.'),
  make('t2-14', 'We', 'our', 'We cooked ___ dinner for the whole family.', 2, '“We” → “our”.'),
  make('t2-15', 'We', 'our', 'We found ___ lost kite on the roof.', 2, '“We” → “our”.'),
  make('t2-16', 'We', 'our', 'We share ___ big umbrella when it rains.', 2, '“We” → “our”.'),
  make('t2-17', 'We', 'our', 'We cheered for ___ school soccer team.', 2, '“We” → “our”.'),
  make('t2-18', 'We', 'our', 'We are building ___ treehouse this summer.', 2, '“We” → “our”.'),
  // Plural owners hiding behind "the …" — still gentle, but you must read.
  make('t2-19', 'They', 'their', 'The children hung ___ stockings by the fireplace.', 2, 'The children = they → “their”.'),
  make('t2-20', 'They', 'their', 'The twins finished ___ homework before dinner.', 2, 'The twins = they → “their”.'),
  make('t2-21', 'They', 'their', 'The birds fed ___ hungry chicks all day.', 2, 'The birds = they → “their”.'),
  make('t2-22', 'They', 'their', 'The neighbors planted ___ garden with bright flowers.', 2, 'The neighbors = they → “their”.'),
  make('t2-23', 'They', 'their', 'The players celebrated ___ big win with a pizza.', 2, 'The players = they → “their”.'),
  make('t2-24', 'They', 'their', 'They washed ___ car on Sunday.', 2, '“They” → “their”.'),

  /* ---------- Tier 3 (Level 3): his / her / its + gentle review ---------- */
  make('t3-01', 'He', 'his', 'He forgot ___ wallet at home.', 3, '“He” → “his”.'),
  make('t3-02', 'He', 'his', 'He plays ___ guitar in a band.', 3, '“He” → “his”.'),
  make('t3-03', 'He', 'his', 'He is tying ___ shoelaces.', 3, '“He” → “his”.'),
  make('t3-04', 'He', 'his', 'He always carries ___ backpack to school.', 3, '“He” → “his”.'),
  make('t3-05', 'He', 'his', 'He is drawing ___ map of the moon.', 3, '“He” → “his”.'),
  make('t3-06', 'He', 'his', 'He baked ___ birthday cake by himself.', 3, '“He” → “his”.'),
  make('t3-07', 'He', 'his', 'He put ___ keys on the kitchen table.', 3, '“He” → “his”.'),
  make('t3-08', 'She', 'her', 'She is wearing ___ favorite scarf.', 3, '“She” → “her”.'),
  make('t3-09', 'She', 'her', 'She keeps ___ diary under the mattress.', 3, '“She” → “her”.'),
  make('t3-10', 'She', 'her', 'She painted ___ bedroom blue.', 3, '“She” → “her”.'),
  make('t3-11', 'She', 'her', 'She left ___ notebook on the desk.', 3, '“She” → “her”.'),
  make('t3-12', 'She', 'her', 'She trains ___ dog every evening.', 3, '“She” → “her”.'),
  make('t3-13', 'She', 'her', 'She designed ___ costume for the play.', 3, '“She” → “her”.'),
  make('t3-14', 'She', 'her', 'She brought ___ camera to the beach.', 3, '“She” → “her”.'),
  // "its" = animals and things are "it". Never "it's" (that means "it is").
  make('t3-15', 'It', 'its', 'The cat licked ___ paws clean.', 3, 'An animal is “it” → “its”.'),
  make('t3-16', 'It', 'its', 'The robot charges ___ battery overnight.', 3, 'A thing is “it” → “its”.'),
  make('t3-17', 'It', 'its', 'The bird built ___ nest in the tree.', 3, 'An animal is “it” → “its”.'),
  make('t3-18', 'It', 'its', 'The car needs ___ oil changed.', 3, 'A thing is “it” → “its”.'),
  make('t3-19', 'It', 'its', 'The puppy followed ___ mother across the yard.', 3, 'An animal is “it” → “its”.'),
  make('t3-20', 'It', 'its', 'The storm damaged ___ roof.', 3, 'A thing is “it” → “its”. Never “it’s”.'),
  // Gentle review of the old four.
  make('t3-21', 'I', 'my', 'I adopted ___ kitten from the shelter.', 3, 'Mixed review: “I” → “my”.'),
  make('t3-22', 'You', 'your', 'You should email ___ report to the teacher.', 3, 'Mixed review: “you” → “your”.'),
  make('t3-23', 'We', 'our', 'We donated ___ old toys.', 3, 'Mixed review: “we” → “our”.'),
  make('t3-24', 'They', 'their', 'They painted ___ mural on the wall.', 3, 'Mixed review: “they” → “their”.'),

  /* ---------- Tier 4 (Level 4): names & owners in the middle ---------- */
  make('t4-01', 'He', 'his', 'David forgot ___ homework on the train.', 4, 'David is a boy’s name → “his”.'),
  make('t4-02', 'He', 'his', 'Marcus is fixing ___ bicycle chain.', 4, 'Marcus → “he” → “his”.'),
  make('t4-03', 'He', 'his', 'The boy found ___ hat under the bench.', 4, 'The boy = he → “his”.'),
  make('t4-04', 'He', 'his', 'Grandpa told us about ___ old bicycle.', 4, 'Grandpa = he → “his”.'),
  make('t4-05', 'He', 'his', 'Tom needs ___ locker combination.', 4, 'Tom → “he” → “his”.'),
  make('t4-06', 'He', 'his', 'The king opened ___ secret letter.', 4, 'The king = he → “his”.'),
  make('t4-07', 'He', 'his', 'At the park, Daniel threw ___ frisbee really far.', 4, 'Daniel → “he” → “his”.'),
  make('t4-08', 'She', 'her', 'Maria brushed ___ long hair.', 4, 'Maria is a girl’s name → “her”.'),
  make('t4-09', 'She', 'her', 'The girl waved at ___ mother from the window.', 4, 'The girl = she → “her”.'),
  make('t4-10', 'She', 'her', 'Grandma keeps ___ recipes in an old book.', 4, 'Grandma = she → “her”.'),
  make('t4-11', 'She', 'her', 'Emma forgot ___ lunchbox on the bus.', 4, 'Emma → “she” → “her”.'),
  make('t4-12', 'She', 'her', 'The dancer wore ___ lucky earrings.', 4, 'The dancer = she → “her”.'),
  make('t4-13', 'She', 'her', 'Lucia loves ___ new skates.', 4, 'Lucia → “she” → “her”.'),
  make('t4-14', 'She', 'her', 'For the recital, Sofia practiced ___ dance every day.', 4, 'Sofia → “she” → “her”.'),
  make('t4-15', 'It', 'its', 'The puppy chased ___ own tail in circles.', 4, 'An animal is “it” → “its”.'),
  make('t4-16', 'It', 'its', 'The snake shed ___ skin in the garden.', 4, 'An animal is “it” → “its”.'),
  make('t4-17', 'It', 'its', 'The tent protected ___ campers from the rain.', 4, 'A thing is “it” → “its”.'),
  make('t4-18', 'It', 'its', 'The van needs ___ wheels checked.', 4, 'A thing is “it” → “its”.'),
  make('t4-19', 'It', 'its', 'The video game lost ___ save file.', 4, 'A thing is “it” → “its”.'),
  make('t4-20', 'It', 'its', 'The baby waved ___ tiny hand.', 4, 'A baby is “it” → “its”.'),
  make('t4-21', 'She', 'her', 'Anna built ___ model rocket last weekend.', 4, 'Anna → “she” → “her”.'),
  make('t4-22', 'He', 'his', 'Uncle Joe washed ___ motorcycle in the driveway.', 4, 'Uncle Joe = he → “his”.'),
  make('t4-23', 'It', 'its', 'The chef seasoned ___ soup with fresh herbs.', 4, 'The chef = it → “its”.'),
  make('t4-24', 'It', 'its', 'The robot fixed ___ gears with a tiny wrench.', 4, 'A thing is “it” → “its”.'),

  /* ---------- Tier 5 (Level 5+): all mixed, hardest shapes (still gentle) ---------- */
  make('t5-01', 'They', 'their', 'The team celebrated ___ victory with a big cheer.', 5, 'A team works together = they → “their”.'),
  make('t5-02', 'They', 'their', 'The class planted ___ garden behind the school.', 5, 'A class = many students → “their”.'),
  make('t5-03', 'They', 'their', 'The band tuned ___ instruments before the show.', 5, 'A band = many players → “their”.'),
  make('t5-04', 'They', 'their', 'The jury made ___ decision before lunch.', 5, 'A jury = many people → “their”.'),
  make('t5-05', 'I', 'my', 'I am proud of ___ progress in English.', 5, 'The owner is “I” → “my”.'),
  make('t5-06', 'I', 'my', 'Before the test, I reviewed ___ notes twice.', 5, 'The owner is “I” → “my”.'),
  make('t5-07', 'I', 'my', 'When I grow up, I want to follow ___ dream.', 5, 'The owner is “I” → “my”.'),
  make('t5-08', 'You', 'your', 'For the show, you should practice ___ lines.', 5, 'The owner is “you” → “your”.'),
  make('t5-09', 'You', 'your', 'When you arrive, please bring ___ passport.', 5, 'The owner is “you” → “your”.'),
  make('t5-10', 'You', 'your', 'If you practice every day, you will improve ___ English.', 5, 'The owner is “you” → “your”.'),
  make('t5-11', 'We', 'our', 'To save money, we packed ___ own snacks.', 5, 'The owner is “we” → “our”.'),
  make('t5-12', 'We', 'our', 'After the game, we washed ___ muddy jerseys.', 5, 'The owner is “we” → “our”.'),
  make('t5-13', 'He', 'his', 'The knight polished ___ armor before the parade.', 5, 'The knight = he → “his”.'),
  make('t5-14', 'He', 'his', 'On the first day, Ben forgot ___ school schedule.', 5, 'Ben = he → “his”.'),
  make('t5-15', 'He', 'his', 'With a loud whistle, Marco called ___ dog.', 5, 'Marco = he → “his”.'),
  make('t5-16', 'She', 'her', 'During the storm, Olivia wore ___ rain boots.', 5, 'Olivia = she → “her”.'),
  make('t5-17', 'She', 'her', 'Because of the wind, Mia held ___ hat.', 5, 'Mia = she → “her”.'),
  make('t5-18', 'She', 'her', 'The teacher corrected ___ spelling on the paper.', 5, 'The teacher = she → “her”.'),
  make('t5-19', 'It', 'its', 'After hibernating, the bear checked ___ den.', 5, 'An animal is “it” → “its”.'),
  make('t5-20', 'It', 'its', 'When it rained, the snail hid under ___ shell.', 5, 'An animal is “it” → “its”.'),
  make('t5-21', 'It', 'its', 'The elephant sprayed water over ___ back.', 5, 'An animal is “it” → “its”.'),
  make('t5-22', 'It', 'its', 'The lion yawned and stretched ___ big jaws.', 5, 'An animal is “it” → “its”.'),
  make('t5-23', 'It', 'its', 'The robot thanked ___ owner for the new battery.', 5, 'A thing is “it” → “its”.'),
  make('t5-24', 'They', 'their', 'The tourists took ___ pictures of the waterfall.', 5, 'The tourists = they → “their”.'),
];

/* ---------------- pools ---------------- */

export const EARLY_POOL = ['my', 'your', 'our', 'their'];
export const FULL_POOL = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];

/** Determiners available as answers/distractors at a given level. */
export function unlockedPool(level) {
  return level >= 3 ? [...FULL_POOL] : [...EARLY_POOL];
}

/** Question pool unlocked at a given level (tiers 1..level). */
export function questionsForLevel(level) {
  return QUESTIONS.filter((q) => q.level <= level);
}
