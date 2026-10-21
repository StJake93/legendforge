// Combat data (v2, docs/Combat_Schema.md section B and C) for the four arcane classes:
// Bard, Sorcerer, Warlock, Wizard. Registers window.ACTION_FX, window.RESOURCE_POOLS and window.RESOURCE_REST.
//
// ALLY QA FIXES (tests/suites/ally.js)
//   * Healing Light: cost.n was the string "CHA_MIN1". The engine subtracts cost.n from the pool as a number, so one use turned
//     the pool into NaN and the resource check then passed forever (unlimited healing). Now cost.n is 1: one die per bonus
//     action, each die heals 1d6, so the pool's total healing is unchanged. (Other string n values, "CHA_MIN1" on Mantle of
//     Inspiration, "MOD_INT" on Bulwark of Force, "MOD_CHA" on Abjure Foes, are an engine gap, listed in the ally QA report.)
//
// SCOPE
//   Every class feature and every subclass feature of Bard, Sorcerer, Warlock and Wizard in data_classes_1/3.js
//   (4 colleges, 4 sorcerous origins, 4 patrons, 4 schools), plus every option of the option features
//   Metamagic (10), Eldritch Invocations (28), Elemental Affinity (5), Steps of the Fey (4), Fiendish Resilience (12).
//   Each name has one entry: an effect, `combat: "none" | "exploration" | "social"`, `combat: "zones"` (needs Phase 2
//   positioning, vision or flight), or `combat: "todo"` (the contract cannot express it; `notes` says what the engine needs).
//
// SOURCES (2024 rules only, checked against three texts that agree with each other)
//   dnd2024.wikidot.com (2024 Player's Handbook class, subclass, Metamagic and Eldritch Invocation pages);
//   SRD 5.2.1 through the open5e v2 API (document srd-2024: Bard, College of Lore, Sorcerer, Draconic Sorcery,
//   Warlock, Fiend Patron, Wizard, Evoker, Metamagic, invocations); 5etools XPHB class data. The 2024 glossary
//   (D&D Beyond free rules) was used for the Invisible condition; the wikidot spell pages for Counterspell and Misty Step.
//
// RULES THE ENGINE APPLIES ITSELF (no entry here, per the contract)
//   Spellcasting, Pact Magic, Ability Score Improvement, Epic Boon, Subclass Feature (placeholder rows), Extra Attack.
//   College of Valor's Extra Attack is NOT plain Extra Attack: it also lets you replace one of the two attacks with an
//   action-cast cantrip. That replacement is engine work.
//
// CONVENTIONS USED HERE (the contract's keys, used in a few specific ways; all are listed again in the final report)
//   * `combat: "zones"` marks effects that only matter with positioning, flight, teleport or light (Phase 2).
//     Zone data (Combat_Schema F.2): Misty Escape is now a free-cast of Misty Step (which is kind "move") as a Reaction. The other
//     seven stay "zones": Dragon Wings and Revelation in Flesh (flight and swim states that last past a turn), Bewitching Magic
//     (a free Misty Step after another spell), Inspiring Movement (a reaction triggered by an enemy ending its turn nearby),
//     and the vision features The Third Eye, Devil's Sight and Witch Sight.
//   * Metamagic: flags live in `effect` (careful, empower, ...) and counts live in `n` ("CHA_MIN1" = max(1, CHA modifier)).
//     Cost is `{ pool: "Font of Magic", n }`. Empowered Spell and Seeking Spell may be added to a casting that already uses
//     another option; with Sorcery Incarnate (Innate Sorcery active) any two options may be combined. The engine enforces that.
//   * `effect.bonus` is added to a d20 after it is rolled (Bardic Inspiration, Peerless Skill, Bend Luck, Dark One's Own Luck).
//     `effect.subtract` is taken off a roll (Cutting Words). `effect.reroll: "advantage"` rerolls with Advantage (Countercharm);
//     `reroll: true` would be a plain reroll. `effect.survive` + `hpOnSurvive` are as for Relentless Rage; the new token
//     "HALF_MAX_HP" (Searing Vengeance) means half the creature's Hit Point maximum.
//   * SPELL-SCOPED ENTRIES: an entry with a `spell` key and kind "special" (Agonizing Blast, Repelling Blast, Eldritch Spear)
//     applies only to that spell; the engine must not apply it to other spells. Its `dmg`, `onHit` and `range` are what is
//     added to that spell. Default spell is Eldritch Blast (the invocations are repeatable per cantrip, but the character data
//     does not record which cantrip was chosen).
//   * TYPED SPELL BONUS: a "passive" with `dmg: [{ dice, type }]` and no `weapon` adds `dice` once to one damage roll of a spell
//     you cast that deals `type` (a list means either type). `once: "turn"` limits it to once per turn; otherwise once per cast.
//     (Elemental Affinity, Radiant Soul.) The contract has no mod for this, so the engine reads these two keys.
//   * WEAPON-SCOPED ENTRIES: `weapon: "pact"` means the Pact of the Blade weapon only; `weapon: "unarmed"` means Unarmed Strikes.
//   * Entries that are a reaction AND have a permanent part (Beguiling Defenses) carry the permanent part in `fx`.
//   * `kind: "recover"` with `econ: "none"` is a rest-time effect (Arcane Recovery, Sorcerous Restoration, Magical Cunning),
//     not an in-fight action. Magical Cunning is a 1-minute rite, so it is a between-fights action.
//   * `kind: "free-cast"` with no `uses` is at will (the invocations that grant a spell at will).
//   * Healing Light spends one die per use (cost.n 1, heal 1d6); see the ally QA note below.
//   * Keys that share a name with another owner are `"Name|Owner"`: Choose a Subclass, Expertise, and every Elemental
//     Affinity and Fiendish Resilience option (Acid, Cold, Fire, Lightning and Poison appear in both).
//
// SIMPLIFICATIONS (each is also in the entry's notes)
//   * Bardic Inspiration lasts 1 hour; `until: "fight"` stands in for it. It never targets the Bard (2024).
//   * Mantle of Inspiration gives twice ONE die roll as temporary HP; the data rolls the die twice and adds
//     (BI_DIE+BI_DIE): same average, narrower spread.
//   * Beguiling Magic lets the Bard choose Charmed or Frightened; only the Charmed rider is in the data (engine: offer both).
//   * Tides of Chaos is Advantage on one D20 Test; the data gives Advantage on attack rolls until the next hit.
//   * Searing Vengeance triggers when the creature drops to 0 HP, not at its first death save (same end state, earlier).
//   * Hurl Through Hell removes the target from the fight until the end of your next turn; Incapacitated stands in for that.
//   * Clairvoyant Combatant: `attackersAdv` gives every attacker Advantage, and `atkDis` gives Disadvantage on all the
//     target's attacks (the rule is "against you" and "you"). Exact in a one-on-one fight; wrong in a party fight.
//   * Taunting Step is a text rider only (Disadvantage on attacks against creatures OTHER than you): in a one-on-one fight it
//     correctly does nothing; the party fight needs a "disadvantage against others" modifier.
//   * Disappearing Step uses Invisible's effects (attackers Disadvantage, your attacks Advantage); the early end (when you
//     attack, deal damage or cast a spell) is not tracked.
//   * Lifedrinker's Hit Die heal is in `notes` only: there is no Hit Dice pool to charge it against.
//   * Eldritch Smite's Pact Magic slot cost is in `notes` only (the contract has no slot-spend cost).
//   * Sorcerous Restoration and Arcane Recovery are pools plus a rest-time `recover` entry; the engine must implement the
//     recovery amounts named in `notes`.
//
// DATA ERRORS FOUND IN data_options.js (not edited; this file follows the 2024 source)
//   * Steps of the Fey, Dreadful Step: the option text says damage near BOTH the departure and arrival points; 2024 says
//     within 5 ft of the space you left OR the space you appear in (your choice), one of the two.
//   * Steps of the Fey, Disappearing Step: the text says Invisible "until you attack"; 2024 ends it after any attack roll,
//     damage dealt or spell cast.
//   * Lifedrinker: the text omits the extra damage dice (1d6) and the heal (Hit Die roll + CON modifier, minimum 1).

window.ACTION_FX = Object.assign(window.ACTION_FX || {}, {

  // ====================================================================== BARD
  "Bardic Inspiration": { owner: "Bard", kind: "buff", econ: "bonus", uses: "Bardic Inspiration", target: "ally", until: "fight",
    effect: { bonus: "BI_DIE" },
    notes: "Another creature within 60 ft that can see or hear you (never yourself). It holds one die at a time and, after failing a D20 Test, rolls the die and adds it to the d20 (BI_DIE: d6, d8 at 5, d10 at 10, d12 at 15). Real duration is 1 hour; the fight stands in for it." },
  "Bardic Inspiration (d10)": { owner: "Bard", combat: "none", notes: "The die size is the BI_DIE token." },
  "Bardic Inspiration (d12)": { owner: "Bard", combat: "none", notes: "The die size is the BI_DIE token." },
  "Expertise|Bard": { owner: "Bard", combat: "none", notes: "Skill checks only." },
  "Jack of All Trades": { owner: "Bard", kind: "passive", fx: { jackOfAllTrades: true },
    notes: "2024: half PB (round down) on ability checks that use a skill you lack and that don't already use PB. It does not apply to a plain Initiative check (no skill)." },
  "Choose a Subclass|Bard": { owner: "Bard", combat: "none" },
  "Font of Inspiration": { owner: "Bard", combat: "todo", econ: "free", target: "self",
    notes: "Short-rest recharge is in RESOURCE_REST (Bardic Inspiration shortFrom level 5). In a fight: expend any one spell slot, no action, to regain one Bardic Inspiration use. Engine needs a 'spend a spell slot of your choice to regain 1 use of a pool' action." },
  "Countercharm": { owner: "Bard", kind: "reaction", trigger: "failedSave", econ: "reaction", target: "creature", effect: { reroll: "advantage" },
    notes: "You or a creature within 30 ft fails a saving throw against an effect that applies Charmed or Frightened: the save is rerolled with Advantage. Only for saves against those two conditions." },
  "Magical Secrets": { owner: "Bard", combat: "none", notes: "Spell list access." },
  "Superior Inspiration": { owner: "Bard", combat: "todo", econ: "none",
    notes: "When you roll Initiative, regain Bardic Inspiration uses until you have two. Engine needs a start-of-fight hook that raises the pool to at least 2." },
  "Words of Creation": { owner: "Bard", combat: "todo",
    notes: "Power Word Heal and Power Word Kill are always prepared. Casting either may also target a second creature within 10 ft of the first. Engine needs +1 adjacent target for those two spells." },

  // College of Dance
  "Dazzling Footwork": { owner: "College of Dance", kind: "passive", mods: { acBase: "10+MOD_DEX+MOD_CHA" }, weapon: "unarmed", ability: "DEX",
    dmg: [{ dice: "BI_DIE+MOD_DEX", type: "bludgeoning" }],
    notes: "Only while you wear no armor and carry no Shield. Unarmored Defense: base AC 10 + DEX + CHA (engine_gear.js already computes it). Bardic Damage: your Unarmed Strikes can use DEX for the attack and deal BI_DIE + DEX bludgeoning instead of normal damage; the roll does not use up the die. Agile Strikes (engine work): whenever you expend a Bardic Inspiration use as part of an action, Bonus Action or Reaction, you may make one Unarmed Strike as part of it. Dance Virtuoso is a Performance check (no fight effect)." },
  "Inspiring Movement": { owner: "College of Dance", combat: "zones", econ: "reaction", cost: { pool: "Bardic Inspiration", n: 1 },
    notes: "Reaction when an enemy you can see ends its turn within 5 ft: expend one use, move up to half your Speed, and one ally within 30 ft moves up to half its Speed with its own Reaction. No Opportunity Attacks. Pure movement." },
  "Tandem Footwork": { owner: "College of Dance", combat: "todo", cost: { pool: "Bardic Inspiration", n: 1 }, fx: { initBonus: "BI_DIE" },
    notes: "Optional, paid when you roll Initiative (not Incapacitated): expend one use, roll the Bardic die, and you and each ally within 30 ft who can see or hear you add the number to Initiative. Engine needs an opt-in cost at the Initiative roll; `fx.initBonus` is the bonus and must not be applied for free." },
  "Leading Evasion": { owner: "College of Dance", kind: "passive", fx: { evasion: true },
    notes: "Evasion that you can share with creatures within 5 ft making the same DEX save. Not usable while Incapacitated." },

  // College of Glamour
  "Beguiling Magic": { owner: "College of Glamour", kind: "save-effect", econ: "free", target: "enemy", save: "WIS", dc: "SPELL",
    usesFlat: 1, rest: { short: "none", long: "all" },
    onFail: [{ cond: "charmed", until: "rounds:10", repeat: "end" }],
    notes: "Use immediately after casting an Enchantment or Illusion spell with a spell slot, on a creature you can see within 60 ft. The Bard chooses Charmed OR Frightened (engine: offer both; only Charmed is in the data). Repeats the save at the end of each of its turns. Charm Person and Mirror Image are always prepared. The use is restored by expending one Bardic Inspiration use (no action)." },
  "Mantle of Inspiration": { owner: "College of Glamour", kind: "temphp", econ: "bonus", cost: { pool: "Bardic Inspiration", n: 1 },
    target: "allies", n: "CHA_MIN1", temp: "BI_DIE+BI_DIE",
    notes: "Expend one use and roll the Bardic die. Up to CHA modifier (min 1) OTHER creatures within 60 ft each gain temporary HP equal to twice that one roll (data: two dice added, same average), then each may use its Reaction to move up to its Speed with no Opportunity Attacks (movement not modelled)." },
  "Mantle of Majesty": { owner: "College of Glamour", kind: "free-cast", spell: "Command", econ: "bonus", usesFlat: 1, rest: { short: "none", long: "all" },
    conc: true, until: "rounds:10",
    notes: "Bonus Action: cast Command with no slot and take on an unearthly look for 1 minute (Concentration). While it lasts you cast Command as a Bonus Action each turn with no slot, and creatures Charmed by you automatically fail the save. The use is restored by expending a level 3+ spell slot (no action)." },
  "Unbreakable Majesty": { owner: "College of Glamour", kind: "toggle", econ: "bonus", target: "self", usesFlat: 1, rest: { short: "all", long: "all" },
    until: "rounds:10", trigger: "hit", save: "CHA", dc: "SPELL", onFail: [{ note: "the attack misses instead" }],
    notes: "For 1 minute (ends if you are Incapacitated): the first time each creature hits you with an attack roll on a turn, it makes a CHA save against your spell DC or that attack misses instead. Engine: convert the hit to a miss on a failed save." },

  // College of Lore
  "Bonus Proficiencies": { owner: "College of Lore", combat: "none", notes: "Three skills." },
  "Cutting Words": { owner: "College of Lore", kind: "reaction", trigger: "attackRoll", econ: "reaction", cost: { pool: "Bardic Inspiration", n: 1 },
    target: "enemy", effect: { subtract: "BI_DIE" },
    notes: "2024: a creature you can see within 60 ft makes a damage roll or SUCCEEDS on an ability check or attack roll. Roll the Bardic die and subtract it, which can turn a hit into a miss or reduce the damage. Use it after the roll shows a hit (or on the damage roll); the engine's attackRoll trigger should fire after the roll is known." },
  "Magical Discoveries": { owner: "College of Lore", combat: "none", notes: "Two always-prepared spells from the Cleric, Druid or Wizard lists." },
  "Peerless Skill": { owner: "College of Lore", kind: "reaction", trigger: "youMiss", econ: "free", cost: { pool: "Bardic Inspiration", n: 1 }, target: "self",
    effect: { bonus: "BI_DIE" },
    notes: "After you fail an ability check or attack roll, expend a use, roll the Bardic die and add it to the d20. If it still fails, the use is not expended. Attack rolls only here; the ability-check half is out of fight." },

  // College of Valor
  "Combat Inspiration": { owner: "College of Valor", combat: "todo", trigger: "hit",
    notes: "A creature holding your Bardic Inspiration die may use it two more ways. Defense: when hit by an attack roll it may use its Reaction, roll the die and add it to its AC against that attack. Offense: immediately after it hits a target with an attack roll, roll the die and add it to that attack's damage. Engine needs the held-die model to offer these two uses to the holder." },
  "Martial Training": { owner: "College of Valor", combat: "none", notes: "Martial weapons, Medium armor, Shields, and a weapon as a Spellcasting Focus: gear engine." },
  "Battle Magic": { owner: "College of Valor", kind: "extra-attacks", econ: "bonus", weapon: "weapon", attacksByLevel: { 14: 1 },
    notes: "One weapon attack as a Bonus Action after you cast a spell that has a casting time of an action this turn (a cantrip counts)." },

  // ====================================================================== SORCERER
  "Innate Sorcery": { owner: "Sorcerer", kind: "toggle", econ: "bonus", target: "self", usesFlat: 2, rest: { short: "none", long: "all" }, until: "rounds:10",
    notes: "1 minute. While active: your Sorcerer spell save DC is +1, and you have Advantage on attack rolls of Sorcerer spells (not weapon attacks). Engine work: no mod covers a spell-only DC bonus or spell-only attack Advantage (needs `spellDC` and `spellAtkAdv`). Sorcery Incarnate lets you activate it for 2 Sorcery Points when out of uses." },
  "Font of Magic": { owner: "Sorcerer", kind: "convert", econ: "bonus", cost: { pool: "Font of Magic", n: "SLOT_COST" }, slotCostByLevel: { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 },
    notes: "Create a spell slot as a Bonus Action. Slot level: cost in Sorcery Points, minimum Sorcerer level: 1: 2 pts, level 2; 2: 3 pts, level 3; 3: 5 pts, level 5; 4: 6 pts, level 7; 5: 7 pts, level 9. Created slots last until a Long Rest. Reverse: expend a spell slot to gain Sorcery Points equal to its level, no action." },
  "Metamagic": { owner: "Sorcerer", combat: "none", notes: "The options carry the effects (kind metamagic). Learn 2 at level 2, 4 at 10, 6 at 17." },
  "Sorcerous Restoration": { owner: "Sorcerer", kind: "recover", econ: "none", uses: "Sorcerous Restoration",
    notes: "Rest-time. When you finish a Short Rest, regain expended Sorcery Points up to floor(Sorcerer level / 2); once per Long Rest (the pool). Not an in-fight action; the Font of Magic recharge in RESOURCE_REST has no short-rest part for this reason." },
  "Sorcery Incarnate": { owner: "Sorcerer", combat: "todo",
    notes: "Two rules. (1) If Innate Sorcery has no uses left you may activate it by spending 2 Sorcery Points with the Bonus Action. (2) While Innate Sorcery is active, up to TWO Metamagic options may be used on each spell. Engine needs an alternate activation cost and a raised Metamagic limit that depends on Innate Sorcery being active." },
  "Arcane Apotheosis": { owner: "Sorcerer", combat: "todo",
    notes: "While Innate Sorcery is active, one Metamagic option per turn costs no Sorcery Points. Engine needs a 'first option each turn is free while Innate Sorcery is on' flag." },

  // Aberrant Sorcery
  "Psionic Spells": { owner: "Aberrant Sorcery", combat: "none", notes: "Always-prepared spell list (bonusSpells)." },
  "Telepathic Speech": { owner: "Aberrant Sorcery", combat: "social", notes: "Bonus Action telepathic link to a creature within 30 ft." },
  "Psionic Sorcery": { owner: "Aberrant Sorcery", combat: "todo",
    notes: "Cast any level 1+ spell from the Psionic Spells list by spending Sorcery Points equal to the spell's level instead of a slot; cast this way it needs no Verbal or Somatic components and no Material components unless consumed or costly. Engine needs an alternate cast cost (Sorcery Points) for the bonusSpells list." },
  "Psychic Defenses": { owner: "Aberrant Sorcery", kind: "passive", mods: { resist: ["psychic"], condAdv: ["charmed", "frightened"] },
    notes: "Resistance to Psychic damage; Advantage on saves to avoid or end Charmed or Frightened." },
  "Revelation in Flesh": { owner: "Aberrant Sorcery", combat: "zones", econ: "bonus", cost: { pool: "Font of Magic", n: 1 },
    notes: "Bonus Action, 10 minutes, spend 1+ Sorcery Points, one benefit per point: swim Speed twice your Speed and water breathing; Fly Speed equal to your Speed with hover; see Invisible creatures within 60 ft (not behind Total Cover); move through 1-inch gaps and spend 5 ft of movement to escape restraints or a grapple. Movement and vision only." },
  "Warping Implosion": { owner: "Aberrant Sorcery", kind: "save-effect", econ: "action", usesFlat: 1, rest: { short: "none", long: "all" },
    area: { shape: "sphere", size: 30 }, save: "STR", dc: "SPELL", half: true, dmg: [{ dice: "3d10", type: "force" }], onFail: [{ pull: 30 }],
    notes: "Magic action: you teleport up to 120 ft to a space you can see; the area is centred on the space you LEFT. Failed save: 3d10 force and pulled toward that space; success: half damage, no pull. The use is restored for 5 Sorcery Points (no action). Teleport and pull are recorded, not applied, until zones." },

  // Clockwork Sorcery
  "Clockwork Spells": { owner: "Clockwork Sorcery", combat: "none", notes: "Always-prepared spell list (bonusSpells)." },
  "Restore Balance": { owner: "Clockwork Sorcery", combat: "todo", trigger: "attackRoll", econ: "reaction", uses: "Restore Balance", target: "creature",
    notes: "Reaction when a creature you can see within 60 ft is about to roll a d20 with Advantage or Disadvantage (any D20 Test): the roll is not affected by Advantage or Disadvantage (a single d20). Uses = CHA modifier (min 1) per Long Rest (pool). Engine needs a pre-roll reaction that cancels advantage and disadvantage." },
  "Bastion of Law": { owner: "Clockwork Sorcery", combat: "todo", econ: "action", cost: { pool: "Font of Magic", n: 1 }, target: "creature",
    notes: "Magic action: spend 1 to 5 Sorcery Points to ward yourself or a creature you can see within 30 ft with that many d8s. When the warded creature takes damage it may expend any number of the dice, roll them, and reduce the damage by the total. Lasts until a Long Rest or until you use this again. Engine needs a per-creature pool of ward dice." },
  "Trance of Order": { owner: "Clockwork Sorcery", combat: "todo", econ: "bonus", target: "self", usesFlat: 1, rest: { short: "none", long: "all" }, until: "rounds:10",
    notes: "1 minute: attack rolls against you cannot have Advantage; on your D20 Tests a d20 roll of 9 or lower counts as 10. Restored for 5 Sorcery Points (no action). Engine needs 'attackers cannot have advantage' and a d20 floor of 10 (neither is in the mods list)." },
  "Clockwork Cavalcade": { owner: "Clockwork Sorcery", kind: "heal", econ: "action", usesFlat: 1, rest: { short: "none", long: "all" },
    target: "allies", area: { shape: "cube", size: 30 }, heal: "100",
    notes: "Magic action, 30-ft Cube from you. Restores up to 100 HP divided as you choose among creatures of your choice in the Cube; repairs damaged objects; ends every spell of level 6 or lower on creatures and objects of your choice. Restored for 7 Sorcery Points (no action). The spell-ending part is not modelled." },

  // Draconic Sorcery
  "Draconic Resilience": { owner: "Draconic Sorcery", kind: "passive", mods: { acBase: "10+MOD_DEX+MOD_CHA" },
    notes: "Base AC 10 + DEX + CHA without armor (also in engine_gear.js). HP maximum +3, then +1 per later Sorcerer level (net: Sorcerer level) is already applied in maxHP() (engine_rules.js); do not add it again." },
  "Draconic Spells": { owner: "Draconic Sorcery", combat: "none", notes: "Always-prepared spell list (bonusSpells)." },
  "Elemental Affinity": { owner: "Draconic Sorcery", combat: "none", notes: "Choose one of five damage types; the effects are the Elemental Affinity option entries (resistance plus a typed spell bonus)." },
  "Dragon Wings": { owner: "Draconic Sorcery", combat: "zones", econ: "bonus", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Bonus Action: wings for 1 hour (or dismiss, no action); Fly Speed 60 ft. Restored for 3 Sorcery Points (no action). Flight only." },
  "Dragon Companion": { owner: "Draconic Sorcery", kind: "free-cast", spell: "Summon Dragon", econ: "action", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Cast Summon Dragon once per Long Rest with no slot (the Material component is never needed). On any casting you may drop the Concentration requirement; the duration then becomes 1 minute." },

  // Wild Magic Sorcery
  "Wild Magic Surge": { owner: "Wild Magic Sorcery", combat: "todo",
    notes: "Once per turn, immediately after casting a Sorcerer spell with a spell slot, roll a d20; on a 20 roll the Wild Magic Surge table (d100, 25 rows of four numbers, 2024 Player's Handbook). A spell produced by the table is not affected by Metamagic. Combat rows: 01-04 roll again at the start of each of your turns for a minute; 05-08 friendly creature appears; 09-12 regain 5 HP at each turn start for a minute; 13-16 creatures have Disadvantage on saves against your next saving-throw spell within a minute; 21-24 your action spells are Bonus Actions for a minute; 25-28 you are in the Astral Plane until end of your next turn; 29-32 next damaging spell within a minute deals maximum damage; 33-36 Resistance to all damage for a minute; 37-40 potted plant until your next turn start (Incapacitated, Vulnerable to all damage); 41-44 teleport 20 ft as a Bonus Action each turn for a minute; 45-48 you and up to three creatures within 30 ft Invisible for a minute; 49-52 +2 AC and immune to Magic Missile for a minute; 53-56 one extra action this turn; 57-60 cast a random spell (d10: Confusion, Fireball, Fog Cloud, Fly, Grease, Levitate, Magic Missile at level 5, Mirror Image, Polymorph on yourself, See Invisibility) with no Concentration; 69-72 Frightened until end of next turn; 73-76 teleport 60 ft; 77-80 random creature within 60 ft Poisoned; 81-84 bright light 30 ft, creatures ending their turn within 5 ft Blinded; 85-88 three creatures within 30 ft take 1d10 necrotic and you regain the total; 89-92 three creatures within 30 ft take 4d10 lightning; 93-96 you and creatures within 30 ft Vulnerable to piercing for a minute; 97-00 d6 of heals, slot or Sorcery Point recovery. 65-68 if you die within the hour you revive as by Reincarnate. Rows 17-20 and 61-64 do nothing in a fight. Engine needs the table and a post-cast hook." },
  "Tides of Chaos": { owner: "Wild Magic Sorcery", kind: "buff", econ: "free", target: "self", usesFlat: 1, rest: { short: "none", long: "all" },
    mods: { atkAdv: true }, until: "nextHit",
    notes: "Advantage on ONE D20 Test, chosen before you roll. The use comes back when you cast a Sorcerer spell with a spell slot (which then triggers a Wild Magic Surge roll automatically, no d20 check) or finish a Long Rest. Data gives Advantage on attack rolls and ends it at the next hit; the engine should end it after the first d20 roll and also offer it on saves and checks." },
  "Bend Luck": { owner: "Wild Magic Sorcery", kind: "reaction", trigger: "attackRoll", econ: "reaction", cost: { pool: "Font of Magic", n: 1 }, target: "creature",
    effect: { subtract: "1d4", bonus: "1d4" },
    notes: "Immediately after another creature you can see rolls the d20 for a D20 Test, spend 1 Sorcery Point, roll 1d4 and apply it as a penalty (subtract: enemy rolls) or a bonus (bonus: ally rolls), your choice. The data trigger covers attack rolls; saves and checks by anyone also qualify." },
  "Controlled Chaos": { owner: "Wild Magic Sorcery", combat: "todo", notes: "Whenever you roll on the Wild Magic Surge table, roll twice and use either result. Depends on Wild Magic Surge." },
  "Tamed Surge": { owner: "Wild Magic Sorcery", combat: "todo", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Immediately after casting a Sorcerer spell with a slot, pick any Wild Magic Surge row except the last instead of rolling (make any roll that row requires). Once per Long Rest. Depends on Wild Magic Surge." },

  // ====================================================================== WARLOCK
  "Eldritch Invocations": { owner: "Warlock", combat: "none", notes: "The options carry the effects. Known: 1 at level 1, 3 at 2, 5 at 5, 6 at 7, 7 at 9, 8 at 12, 9 at 15, 10 at 18." },
  "Eldritch Invocations (5)": { owner: "Warlock", combat: "none", notes: "Invocations known rise to 5; Pact Magic slots become level 3." },
  "Eldritch Invocations (6)": { owner: "Warlock", combat: "none", notes: "Invocations known rise to 6; Pact Magic slots become level 4." },
  "Eldritch Invocations (10)": { owner: "Warlock", combat: "none", notes: "Invocations known rise to 10." },
  "Choose a Subclass|Warlock": { owner: "Warlock", combat: "none" },
  "Magical Cunning": { owner: "Warlock", kind: "recover", econ: "none", usesFlat: 1, rest: { short: "none", long: "all" }, effect: { pactSlots: "half" },
    notes: "A 1-minute rite, so it is a between-fights action, not a mid-fight one. Regain expended Pact Magic slots up to half your maximum (round up). Once per Long Rest." },
  "Contact Patron": { owner: "Warlock", combat: "exploration", notes: "Contact Other Plane once per Long Rest with no slot and an automatic save success." },
  "Mystic Arcanum (Level 6 Spell)": { owner: "Warlock", kind: "special", econ: "none", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Cast the chosen level 6 Warlock spell once per Long Rest with no slot, at level 6 (no upcasting). The chosen spell is in the character's spell data (ss.arcanum[6])." },
  "Mystic Arcanum (Level 7 Spell)": { owner: "Warlock", kind: "special", econ: "none", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "As the level 6 arcanum, for a level 7 spell (ss.arcanum[7])." },
  "Mystic Arcanum (Level 8 Spell)": { owner: "Warlock", kind: "special", econ: "none", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "As the level 6 arcanum, for a level 8 spell (ss.arcanum[8])." },
  "Mystic Arcanum (Level 9 Spell)": { owner: "Warlock", kind: "special", econ: "none", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "As the level 6 arcanum, for a level 9 spell (ss.arcanum[9]). You also gain your fourth Pact Magic slot at this level (engine: pactSlots table)." },
  "Eldritch Master": { owner: "Warlock", kind: "recover", econ: "none", usesFlat: 1, rest: { short: "none", long: "all" }, effect: { pactSlots: "all" }, replaces: "Magical Cunning",
    notes: "When you use Magical Cunning, regain ALL expended Pact Magic slots instead of half. Still once per Long Rest and still a 1-minute rite." },

  // Archfey Patron
  "Archfey Spells": { owner: "Archfey Patron", combat: "none", notes: "Always-prepared spell list (bonusSpells)." },
  "Steps of the Fey": { owner: "Archfey Patron", kind: "free-cast", spell: "Misty Step", econ: "bonus", uses: "Steps of the Fey",
    notes: "Cast Misty Step with no slot CHA modifier (min 1) times per Long Rest. Whenever you cast Misty Step (free or with a slot) you may add ONE of the Steps of the Fey effects you know (Refreshing Step, Taunting Step; from level 6 also Disappearing Step, Dreadful Step). Each effect is its own option entry." },
  "Misty Escape": { owner: "Archfey Patron", kind: "free-cast", spell: "Misty Step", trigger: "damaged", econ: "reaction", uses: "Steps of the Fey",
    notes: "You can cast Misty Step as a Reaction in response to taking damage and may add a Steps of the Fey effect. Here it spends a Steps of the Fey use; casting it with a spell slot isn't offered. Adds the Disappearing Step and Dreadful Step options." },
  "Beguiling Defenses": { owner: "Archfey Patron", kind: "reaction", trigger: "hit", econ: "reaction", target: "enemy", usesFlat: 1, rest: { short: "none", long: "all" },
    effect: { halve: true }, save: "WIS", dc: "SPELL", onFail: [{ note: "the attacker takes Psychic damage equal to the damage you take after halving" }],
    fx: { condImmune: ["charmed"] },
    notes: "Permanent: immune to Charmed (fx). Reaction after a creature you can see hits you with an attack roll: halve the damage (round down) and the attacker makes a WIS save against your spell DC; on a failure it takes Psychic damage equal to the damage you take. Once per Long Rest, or restore it by expending a Pact Magic slot (no action)." },
  "Bewitching Magic": { owner: "Archfey Patron", combat: "zones", spell: "Misty Step",
    notes: "Immediately after casting an Enchantment or Illusion spell using an action and a spell slot, cast Misty Step as part of the same action with no slot. Teleport only." },

  // Celestial Patron
  "Celestial Spells": { owner: "Celestial Patron", combat: "none", notes: "Always-prepared spell list (bonusSpells), including the Light and Sacred Flame cantrips." },
  "Healing Light": { owner: "Celestial Patron", kind: "heal", econ: "bonus", target: "creature", cost: { pool: "Healing Light", n: 1 }, heal: "1d6",
    notes: "Pool of d6s equal to 1 + Warlock level, regained on a Long Rest. Bonus Action: heal yourself or a creature you can see within 60 ft by expending up to CHA modifier (min 1) dice at once and rolling them. Modelled as ONE die per use (cost.n 1, heal 1d6): the engine charges a numeric cost.n and rolls one heal, so the pool's total healing is right (each die heals 1d6) but it takes one bonus action per die." },
  "Radiant Soul": { owner: "Celestial Patron", kind: "passive", mods: { resist: ["radiant"] }, dmg: [{ dice: "MOD_CHA", type: ["radiant", "fire"] }], once: "turn",
    notes: "Resistance to Radiant damage. Typed spell bonus: once per turn, when a spell you cast deals Radiant or Fire damage, add CHA modifier to that spell's damage against ONE of its targets." },
  "Celestial Resilience": { owner: "Celestial Patron", kind: "temphp", econ: "none", target: "self", temp: "CLASS_LEVEL+MOD_CHA",
    notes: "Rest-time. Whenever you use Magical Cunning or finish a Short or Long Rest: you gain Warlock level + CHA modifier temporary HP, and up to five creatures you can see each gain half your Warlock level + CHA modifier. A fight can start with these." },
  "Searing Vengeance": { owner: "Celestial Patron", kind: "reaction", trigger: "zero", econ: "none", target: "creature", usesFlat: 1, rest: { short: "none", long: "all" },
    area: { shape: "emanation", size: 30 }, effect: { survive: true, hpOnSurvive: "HALF_MAX_HP" },
    dmg: [{ dice: "2d8+MOD_CHA", type: "radiant" }], onHit: [{ cond: "blinded", until: "turnEnd" }],
    notes: "When you or an ally within 60 ft is about to make a Death Saving Throw (here: when it drops to 0 HP), it regains HP equal to half its HP maximum and may end Prone. Each creature of your choice within 30 ft of it takes 2d8 + CHA modifier radiant and is Blinded until the end of the current turn (no save). Once per Long Rest." },

  // Fiend Patron
  "Dark One's Blessing": { owner: "Fiend Patron", kind: "temphp", trigger: "killed", econ: "none", target: "self", temp: "MOD_CHA+CLASS_LEVEL",
    notes: "When you reduce an enemy to 0 HP, gain CHA modifier + Warlock level temporary HP (minimum 1). Also when someone else reduces an enemy within 10 ft of you to 0 HP." },
  "Fiend Spells": { owner: "Fiend Patron", combat: "none", notes: "Always-prepared spell list (bonusSpells)." },
  "Dark One's Own Luck": { owner: "Fiend Patron", kind: "reaction", trigger: "failedSave", econ: "free", uses: "Dark One's Own Luck", target: "self", effect: { bonus: "1d10" },
    notes: "Add 1d10 to an ability check or saving throw after seeing the roll and before its effects; at most once per roll. Uses: CHA modifier (min 1) per Long Rest. Offered here after a failed save; ability checks are out of fight." },
  "Fiendish Resilience": { owner: "Fiend Patron", combat: "none", notes: "Choose one damage type except force after each Short or Long Rest; the effect is the matching Fiendish Resilience option entry (Resistance)." },
  "Hurl Through Hell": { owner: "Fiend Patron", kind: "on-hit", trigger: "youHit", once: "turn", usesFlat: 1, rest: { short: "none", long: "all" }, save: "CHA", dc: "SPELL",
    onFail: [{ dmg: { dice: "8d10", type: "psychic" }, notTypes: ["Fiend"] }, { cond: "incapacitated", until: "srcTurnEnd" }],
    notes: "Once per turn when you hit with an attack roll: the target makes a CHA save against your spell DC. On a failure it vanishes through the Lower Planes: 8d10 psychic unless it is a Fiend, and until the end of your next turn it is out of the fight, then returns to its space or the nearest free one. Incapacitated stands in for 'out of the fight'. Once per Long Rest, or restore it by expending a Pact Magic slot (no action)." },

  // Great Old One Patron
  "Awakened Mind": { owner: "Great Old One Patron", combat: "social", notes: "Bonus Action telepathic link to a creature you can see within 30 ft; also what Clairvoyant Combatant attaches to." },
  "Great Old One Spells": { owner: "Great Old One Patron", combat: "none", notes: "Always-prepared spell list (bonusSpells); Hex arrives at level 10 with Eldritch Hex." },
  "Psychic Spells": { owner: "Great Old One Patron", kind: "passive", effect: { transmute: ["psychic"] },
    notes: "Your Warlock spells that deal damage may deal Psychic damage instead (your choice each cast, no cost). Your Enchantment and Illusion Warlock spells need no Verbal or Somatic components." },
  "Clairvoyant Combatant": { owner: "Great Old One Patron", kind: "debuff", econ: "bonus", target: "enemy", usesFlat: 1, rest: { short: "all", long: "all" }, save: "WIS", dc: "SPELL",
    onFail: [{ mod: { atkDis: true, attackersAdv: true }, until: "fight" }],
    notes: "When you form the Awakened Mind bond (Bonus Action, creature within 30 ft): WIS save against your spell DC. On a failure it has Disadvantage on attack rolls against you and you have Advantage on attack rolls against it for the bond (minutes equal to your Warlock level). Restored by a Short or Long Rest, or by expending a Pact Magic slot. Modelled as Disadvantage on all its attacks and Advantage for all attackers: exact one-on-one, over-generous in a party." },
  "Eldritch Hex": { owner: "Great Old One Patron", combat: "todo",
    notes: "Hex is always prepared. When you cast Hex and choose an ability, the target also has Disadvantage on saving throws with that ability for the duration. Engine needs Hex's chosen ability stored on the target and a save-disadvantage check. Depends on the SPELL_FX entry for Hex." },
  "Thought Shield": { owner: "Great Old One Patron", kind: "passive", mods: { resist: ["psychic"] },
    notes: "Resistance to Psychic damage. Reflect (engine work): whenever a creature deals Psychic damage to you, it takes the same amount that you take (after Resistance). Thoughts can't be read." },
  "Create Thrall": { owner: "Great Old One Patron", combat: "todo",
    notes: "Summon Aberration may be cast without Concentration (duration becomes 1 minute); the Aberration appears with temporary HP equal to Warlock level + CHA modifier; the first time each turn it hits a creature under your Hex it deals extra Psychic damage equal to the Hex bonus damage. Depends on the Summon Aberration and Hex entries; summons are not targetable in Phase 1." },

  // ====================================================================== WIZARD
  "Ritual Adept": { owner: "Wizard", combat: "none", notes: "Cast Ritual-tag spells from the spellbook as rituals." },
  "Arcane Recovery": { owner: "Wizard", kind: "recover", econ: "none", uses: "Arcane Recovery",
    notes: "Rest-time. When you finish a Short Rest, recover expended spell slots with a combined level up to ceil(Wizard level / 2), none of level 6 or higher. Once per Long Rest (the pool). Not an in-fight action." },
  "Scholar": { owner: "Wizard", combat: "none", notes: "Expertise in one knowledge skill." },
  "Choose a Subclass|Wizard": { owner: "Wizard", combat: "none" },
  "Memorize Spell": { owner: "Wizard", combat: "none", notes: "Swap one prepared spell on a Short Rest." },
  "Spell Mastery": { owner: "Wizard", kind: "special", econ: "none",
    notes: "A level 1 and a level 2 spell with an action casting time, chosen from the spellbook (character data ss.mastery), are always prepared and cast at their lowest level with no slot, at will. Casting at a higher level uses a slot." },
  "Signature Spells": { owner: "Wizard", kind: "special", econ: "none", uses: "Signature Spells",
    notes: "Two level 3 spells chosen from the spellbook (ss.signature), always prepared. Each may be cast once at level 3 with no slot; the use returns on a Short or Long Rest (pool of 2). Casting at a higher level uses a slot." },

  // Abjurer
  "Abjuration Savant": { owner: "Abjurer", combat: "none", notes: "Spellbook." },
  "Arcane Ward": { owner: "Abjurer", kind: "special", econ: "none", usesFlat: 1, rest: { short: "none", long: "all" }, temp: "CLASS_LEVEL*2+MOD_INT",
    notes: "Engine work: a ward-HP pool, not temporary HP. Created when you cast an Abjuration spell with a spell slot (once; you cannot create it again until a Long Rest). Maximum = 2 x Wizard level + INT modifier; it lasts until a Long Rest. While it has HP it takes your damage instead of you (apply your Resistances and Vulnerabilities first); damage beyond its HP carries over to you. At 0 HP it stays but absorbs nothing. Whenever you cast an Abjuration spell with a slot, it regains 2 x that slot's level; as a Bonus Action you can expend a spell slot to give it 2 x that slot's level." },
  "Projected Ward": { owner: "Abjurer", combat: "todo", trigger: "allyDamaged", econ: "reaction", target: "ally",
    notes: "Reaction when a creature you can see within 30 ft takes damage: your Arcane Ward absorbs that damage instead (apply the creature's Resistances and Vulnerabilities first); excess carries to the creature. Needs the Arcane Ward pool." },
  "Spell Breaker": { owner: "Abjurer", combat: "todo",
    notes: "Counterspell and Dispel Magic are always prepared. Dispel Magic may be cast as a Bonus Action, and you add PB to its ability check. When you cast either spell with a slot and it fails to stop a spell, the slot is not expended. Engine needs a Bonus Action Dispel Magic, a PB bonus on its check and a slot refund on failure." },
  "Spell Resistance": { owner: "Abjurer", combat: "todo",
    notes: "Advantage on saving throws against spells and Resistance to the damage of spells. Engine needs a 'source is a spell' flag on saves and damage; the monster trait fx `magicRes` is the same Advantage rule, and the damage half needs spell-damage resistance." },

  // Diviner
  "Divination Savant": { owner: "Diviner", combat: "none", notes: "Spellbook." },
  "Portent": { owner: "Diviner", combat: "todo", econ: "free", uses: "Portent",
    notes: "After a Long Rest roll two d20s (three with Greater Portent) and store the numbers; unused ones are lost at the next Long Rest. Once per turn, replace any D20 Test made by you or a creature you can see (an ally's attack, an enemy's save, anything) with one stored number; choose before the roll. Engine needs stored foretelling rolls and a pre-roll replacement." },
  "Expert Divination": { owner: "Diviner", combat: "todo",
    notes: "When you cast a Divination spell using a level 2+ slot, regain one expended spell slot of a lower level than the slot used, no higher than level 5. Engine needs a post-cast slot refund keyed on the spell's school." },
  "The Third Eye": { owner: "Diviner", combat: "zones", econ: "bonus", usesFlat: 1, rest: { short: "all", long: "all" },
    notes: "Bonus Action: choose Darkvision 120 ft, read any language, or See Invisibility (cast with no slot) until you start a Short or Long Rest. Once per Short or Long Rest. Vision only." },
  "Greater Portent": { owner: "Diviner", combat: "none", notes: "A third Portent die: the Portent pool is 3 from level 14 (byLevel)." },

  // Evoker
  "Evocation Savant": { owner: "Evoker", combat: "none", notes: "Spellbook." },
  "Potent Cantrip": { owner: "Evoker", combat: "todo",
    notes: "When you cast a damaging cantrip and miss with its attack roll, or the target succeeds on its save, the target still takes half the cantrip's damage (round down) and suffers no other effect. Engine needs a cantrip-only 'half damage on miss or successful save' rule for your cantrips (both attack and save cantrips)." },
  "Sculpt Spells": { owner: "Evoker", kind: "passive", effect: { careful: true }, n: "1+SPELL_LEVEL",
    notes: "Evocation spells only, free. When you cast an Evocation spell that affects other creatures you can see, choose 1 + the spell's level of them: they automatically succeed on their saves and take no damage if they would take half. Same engine rule as Careful Spell; n is the count (new token SPELL_LEVEL)." },
  "Empowered Evocation": { owner: "Evoker", combat: "todo",
    notes: "Whenever you cast a Wizard spell from the Evocation school, add INT modifier to ONE damage roll of that spell (once per cast, not per ray or dart). Engine needs a school filter and a once-per-cast flat bonus; the dmgFlat mod would add it to every hit." },
  "Overchannel": { owner: "Evoker", combat: "todo",
    notes: "When you cast a Wizard spell of level 1 to 5 (slot level) that deals damage, deal maximum damage with it on the turn you cast it. First use before a Long Rest has no cost. Each later use before a Long Rest: immediately after the cast you take 2d12 necrotic per level of the slot used, which ignores Resistance and Immunity; the per-level dice rise by 1d12 with each further use (3d12 per level, then 4d12, ...). Engine needs a 'maximise damage' cast option and a use counter that resets on a Long Rest." },

  // Illusionist
  "Illusion Savant": { owner: "Illusionist", combat: "none", notes: "Spellbook." },
  "Improved Illusions": { owner: "Illusionist", combat: "none", notes: "No Verbal components for Illusion spells; +60 ft range if the range is 10+ ft. Minor Illusion is a free cantrip, castable as a Bonus Action, with sound and image in one casting. Range and components are not tracked." },
  "Phantasmal Creatures": { owner: "Illusionist", combat: "todo", usesFlat: 2, rest: { short: "none", long: "all" },
    notes: "Summon Beast and Summon Fey are always prepared. Each may be cast once per Long Rest with no slot as an Illusion spell, which halves the summoned creature's HP (two uses in total, one per spell). Depends on the Summon Beast and Summon Fey entries; summons are not targetable in Phase 1." },
  "Illusory Self": { owner: "Illusionist", combat: "todo", trigger: "hit", econ: "reaction", target: "self", usesFlat: 1, rest: { short: "all", long: "all" },
    notes: "Reaction when a creature hits you with an attack roll: the attack automatically misses you and the illusion ends. Once per Short or Long Rest, or restore it by expending a level 2+ spell slot (no action). Engine needs a reaction that turns a hit into a miss (no effect key does this: AC +99 would last for the whole turn)." },
  "Illusory Reality": { owner: "Illusionist", combat: "none", notes: "Makes one inanimate nonmagical illusory object real for 1 minute; it can't deal damage or impose conditions." },

  // ====================================================================== METAMAGIC (option feature "Metamagic")
  "Careful Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 1 }, effect: { careful: true }, n: "CHA_MIN1",
    notes: "Spell that forces saves: choose up to CHA modifier (min 1) creatures; each automatically succeeds and takes no damage from an effect that would deal half on a success." },
  "Distant Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 1 }, effect: { distant: true },
    notes: "Range of 5 ft or more is doubled; a Touch spell becomes range 30 ft." },
  "Empowered Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 1 }, effect: { empower: true }, n: "CHA_MIN1",
    notes: "After rolling a spell's damage, reroll up to CHA modifier (min 1) of the damage dice and use the new rolls. May be used even if another Metamagic option was used on the same casting." },
  "Extended Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 1 }, effect: { extend: true },
    notes: "Duration of 1 minute or longer is doubled (max 24 hours). If the spell needs Concentration you have Advantage on saving throws to maintain it." },
  "Heightened Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 2 }, effect: { heighten: true },
    notes: "Spell that forces a saving throw: one target has Disadvantage on its saves against the spell." },
  "Quickened Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 2 }, effect: { econ: "bonus" },
    notes: "A spell with an action casting time becomes a Bonus Action. Not allowed if you already cast a level 1+ spell this turn, and you cannot cast a level 1+ spell this turn afterwards (cantrips are fine)." },
  "Seeking Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 1 }, effect: { seek: true },
    notes: "After you miss with a spell attack roll, reroll the d20 and use the new roll. May be used even if another Metamagic option was used on the same casting." },
  "Subtle Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 1 }, effect: { subtle: true },
    notes: "No Verbal, Somatic or Material components, except consumed or costly Material components. Counterspell (2024) needs a spell with V, S or M components, so a Subtle Spell cannot be Counterspelled unless a consumed or costly component remains." },
  "Transmuted Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 1 }, effect: { transmute: ["acid", "cold", "fire", "lightning", "poison", "thunder"] },
    notes: "A spell that deals one of these types may change its damage to any other type in the list." },
  "Twinned Spell": { owner: "Metamagic", kind: "metamagic", cost: { pool: "Font of Magic", n: 1 }, effect: { twin: true },
    notes: "A spell that can target an additional creature when cast with a higher-level slot (SPELL_FX has nUp) is treated as one slot level higher: it gains the extra target and whatever else scales. The slot spent does not change." },

  // ====================================================================== ELDRITCH INVOCATIONS (option feature "Eldritch Invocations")
  "Agonizing Blast": { owner: "Eldritch Invocations", kind: "special", spell: "Eldritch Blast", dmg: [{ dice: "MOD_CHA", type: "force" }],
    notes: "Add CHA modifier to each damage roll of the chosen Warlock damage cantrip (one add per beam for Eldritch Blast). Repeatable, each time for a different eligible cantrip; the data does not record the choice, so apply it to Eldritch Blast." },
  "Armor of Shadows": { owner: "Eldritch Invocations", kind: "free-cast", spell: "Mage Armor", econ: "action", notes: "At will, on yourself, no slot." },
  "Ascendant Step": { owner: "Eldritch Invocations", kind: "free-cast", spell: "Levitate", econ: "action", notes: "At will, on yourself, no slot. Positioning only." },
  "Devil's Sight": { owner: "Eldritch Invocations", combat: "zones", notes: "See normally in Dim Light and Darkness, magical or not, out to 120 ft." },
  "Devouring Blade": { owner: "Eldritch Invocations", kind: "passive", mods: { extraAttacks: 2 }, weapon: "pact", replaces: "Thirsting Blade",
    notes: "Needs Thirsting Blade. The Extra Attack for your pact weapon gives TWO extra attacks (three attacks in all) with the Attack action. Applies to the pact weapon only. Extra Attack features do not stack with each other." },
  "Eldritch Mind": { owner: "Eldritch Invocations", kind: "passive", mods: { concAdv: true }, notes: "Advantage on Constitution saves to maintain Concentration." },
  "Eldritch Smite": { owner: "Eldritch Invocations", kind: "on-hit", trigger: "youHit", once: "turn", weapon: "pact", dmg: [{ dice: "2d8", type: "force" }], up: "1d8",
    onHit: [{ cond: "prone", sizeMax: "Huge" }],
    notes: "Once per turn when you hit with your pact weapon, expend a Pact Magic slot: extra 1d8 force plus 1d8 per slot level, so a level L slot adds (1+L)d8 (data: 2d8 at slot level 1, +1d8 per level above). The target is also Prone if Huge or smaller (no save). Engine needs the slot spend: all Pact Magic slots share one level." },
  "Eldritch Spear": { owner: "Eldritch Invocations", kind: "special", spell: "Eldritch Blast", range: "CLASS_LEVEL*30",
    notes: "The chosen Warlock damage cantrip (range 10+ ft) gains 30 ft of range per Warlock level (added to its range). Repeatable per cantrip; apply to Eldritch Blast. Range only matters with zones." },
  "Fiendish Vigor": { owner: "Eldritch Invocations", kind: "free-cast", spell: "False Life", econ: "action",
    notes: "At will, on yourself, no slot. You do not roll: you always get the maximum on the die, 12 temporary HP at level 1 (2d4+4)." },
  "Gaze of Two Minds": { owner: "Eldritch Invocations", combat: "exploration", notes: "Perceive through a willing touched creature's senses." },
  "Gift of the Depths": { owner: "Eldritch Invocations", combat: "exploration", notes: "Water breathing, Swim Speed equal to your Speed, and one free Water Breathing per Long Rest." },
  "Gift of the Protectors": { owner: "Eldritch Invocations", kind: "reaction", trigger: "zero", econ: "none", target: "creature", usesFlat: 1, rest: { short: "none", long: "all" },
    effect: { survive: true, hpOnSurvive: 1 },
    notes: "Needs the Book of Shadows (Pact of the Tome). Names on its page: up to CHA modifier (min 1), each written with the creature's permission (you may write your own). When a named creature is reduced to 0 HP but not killed outright, it drops to 1 HP instead. Once triggered, no one can benefit again until you finish a Long Rest." },
  "Investment of the Chain Master": { owner: "Eldritch Invocations", combat: "todo",
    notes: "Your Find Familiar gains a 40 ft Fly or Swim Speed, attacks on your Bonus Action command, may deal Necrotic or Radiant instead of its normal types, uses your spell save DC, and you may use your Reaction to give it Resistance against damage it takes. Needs a familiar as a combatant (Pact of the Chain)." },
  "Lessons of the First Ones": { owner: "Eldritch Invocations", combat: "none", notes: "Grants an Origin feat; that feat has its own entry." },
  "Lifedrinker": { owner: "Eldritch Invocations", kind: "on-hit", trigger: "youHit", once: "turn", weapon: "pact", dmg: [{ dice: "1d6", type: ["necrotic", "psychic", "radiant"] }],
    notes: "Once per turn when you hit with your pact weapon: extra 1d6 necrotic, psychic or radiant (your choice), and you may expend one of your Hit Point Dice, roll it and regain that roll + CON modifier HP (minimum 1). The heal is not in the data because there is no Hit Dice pool to charge it against; engine work." },
  "Mask of Many Faces": { owner: "Eldritch Invocations", combat: "social", notes: "Disguise Self at will, no slot." },
  "Master of Myriad Forms": { owner: "Eldritch Invocations", kind: "free-cast", spell: "Alter Self", econ: "action", notes: "At will, on yourself, no slot." },
  "Misty Visions": { owner: "Eldritch Invocations", combat: "exploration", notes: "Silent Image at will, no slot." },
  "One with Shadows": { owner: "Eldritch Invocations", kind: "free-cast", spell: "Invisibility", econ: "action",
    notes: "Only while you are in an area of Dim Light or Darkness, and on yourself. No slot, at will. Needs light levels (zones); until then, offer it only in dim or dark scenes." },
  "Otherworldly Leap": { owner: "Eldritch Invocations", combat: "exploration", notes: "Jump at will, no slot." },
  "Pact of the Blade": { owner: "Eldritch Invocations", kind: "special", econ: "bonus", weapon: "pact", ability: "CHA",
    notes: "Bonus Action: conjure a pact weapon (a Simple or Martial melee weapon of your choice) or bond with a magic weapon you touch. You are proficient with it and can use it as a Spellcasting Focus. Attack and damage rolls with it can use CHA instead of STR or DEX, and it can deal Necrotic, Psychic or Radiant damage or its normal type. The bond ends if you use this Bonus Action again, the weapon is 5+ ft away from you for 1 minute, or you die. Engine: builds the pact weapon attack profile." },
  "Pact of the Chain": { owner: "Eldritch Invocations", combat: "todo",
    notes: "Find Familiar as a Magic action with no slot, with extra forms (Imp, Pseudodragon, Quasit, Skeleton, Slaad Tadpole, Sphinx of Wonder, Sprite, Venomous Snake). When you take the Attack action you may forgo one attack so the familiar attacks with its Reaction. Needs a familiar as a combatant." },
  "Pact of the Tome": { owner: "Eldritch Invocations", combat: "none", notes: "Book of Shadows: three cantrips and two level 1 Ritual spells from any class list, always prepared while the book is on you (spell choices are build data). Gift of the Protectors needs it." },
  "Repelling Blast": { owner: "Eldritch Invocations", kind: "special", spell: "Eldritch Blast", onHit: [{ push: 10, sizeMax: "Large" }],
    notes: "When the chosen Warlock attack-roll cantrip hits a Large or smaller creature, you may push it up to 10 ft straight away from you. Repeatable per cantrip; apply to Eldritch Blast (once per beam). Recorded now, applied with zones." },
  "Thirsting Blade": { owner: "Eldritch Invocations", kind: "passive", mods: { extraAttacks: 1 }, weapon: "pact",
    notes: "Needs Pact of the Blade. Extra Attack for your pact weapon only: two attacks with it when you take the Attack action. Does not stack with another Extra Attack feature." },
  "Visions of Distant Realms": { owner: "Eldritch Invocations", combat: "exploration", notes: "Arcane Eye at will, no slot." },
  "Whispers of the Grave": { owner: "Eldritch Invocations", combat: "exploration", notes: "Speak with Dead at will, no slot." },
  "Witch Sight": { owner: "Eldritch Invocations", combat: "zones", notes: "Truesight 30 ft." },

  // ====================================================================== ELEMENTAL AFFINITY options (Draconic Sorcery)
  "Acid|Elemental Affinity": { owner: "Elemental Affinity", kind: "passive", mods: { resist: ["acid"] }, dmg: [{ dice: "MOD_CHA", type: "acid" }],
    notes: "Resistance to Acid. Typed spell bonus: when you cast a spell that deals Acid damage, add CHA modifier to one damage roll of that spell." },
  "Cold|Elemental Affinity": { owner: "Elemental Affinity", kind: "passive", mods: { resist: ["cold"] }, dmg: [{ dice: "MOD_CHA", type: "cold" }],
    notes: "Resistance to Cold. Typed spell bonus: when you cast a spell that deals Cold damage, add CHA modifier to one damage roll of that spell." },
  "Fire|Elemental Affinity": { owner: "Elemental Affinity", kind: "passive", mods: { resist: ["fire"] }, dmg: [{ dice: "MOD_CHA", type: "fire" }],
    notes: "Resistance to Fire. Typed spell bonus: when you cast a spell that deals Fire damage, add CHA modifier to one damage roll of that spell." },
  "Lightning|Elemental Affinity": { owner: "Elemental Affinity", kind: "passive", mods: { resist: ["lightning"] }, dmg: [{ dice: "MOD_CHA", type: "lightning" }],
    notes: "Resistance to Lightning. Typed spell bonus: when you cast a spell that deals Lightning damage, add CHA modifier to one damage roll of that spell." },
  "Poison|Elemental Affinity": { owner: "Elemental Affinity", kind: "passive", mods: { resist: ["poison"] }, dmg: [{ dice: "MOD_CHA", type: "poison" }],
    notes: "Resistance to Poison. Typed spell bonus: when you cast a spell that deals Poison damage, add CHA modifier to one damage roll of that spell." },

  // ====================================================================== STEPS OF THE FEY options (Archfey Patron; all four known from level 6)
  "Refreshing Step": { owner: "Steps of the Fey", kind: "temphp", econ: "free", target: "creature", temp: "1d10",
    notes: "Added to a Misty Step cast: immediately after you teleport, you or one creature you can see within 10 ft gains 1d10 temporary HP." },
  "Taunting Step": { owner: "Steps of the Fey", kind: "save-effect", econ: "free", area: { shape: "emanation", size: 5 }, save: "WIS", dc: "SPELL",
    onFail: [{ note: "Disadvantage on attack rolls against creatures other than you until the start of your next turn" }],
    notes: "Added to a Misty Step cast: creatures within 5 ft of the space you left make a WIS save against your spell DC. The rider is text only because the effect is 'against creatures other than you': it does nothing in a one-on-one fight. Party fights need a 'disadvantage against others' modifier." },
  "Disappearing Step": { owner: "Steps of the Fey", kind: "buff", econ: "free", target: "self", until: "srcTurnStart", mods: { attackersDis: true, atkAdv: true },
    notes: "Added to a Misty Step cast: you have the Invisible condition until the start of your next turn, or until immediately after you make an attack roll, deal damage or cast a spell. The early end is not tracked. Invisible (2024): attack rolls against you have Disadvantage and yours have Advantage, except against creatures that can somehow see you." },
  "Dreadful Step": { owner: "Steps of the Fey", kind: "save-effect", econ: "free", area: { shape: "emanation", size: 5 }, save: "WIS", dc: "SPELL", dmg: [{ dice: "2d10", type: "psychic" }],
    notes: "Added to a Misty Step cast: creatures within 5 ft of the space you left OR the space you appear in (your choice of one) make a WIS save against your spell DC or take 2d10 psychic. No damage on a success." },

  // ====================================================================== FIENDISH RESILIENCE options (Fiend Patron; one chosen after each rest, never force)
  "Acid|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["acid"] }, notes: "Resistance to Acid until you choose another type after a Short or Long Rest." },
  "Bludgeoning|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["bludgeoning"] }, notes: "Resistance to Bludgeoning until you choose another type after a Short or Long Rest." },
  "Cold|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["cold"] }, notes: "Resistance to Cold until you choose another type after a Short or Long Rest." },
  "Fire|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["fire"] }, notes: "Resistance to Fire until you choose another type after a Short or Long Rest." },
  "Lightning|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["lightning"] }, notes: "Resistance to Lightning until you choose another type after a Short or Long Rest." },
  "Necrotic|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["necrotic"] }, notes: "Resistance to Necrotic until you choose another type after a Short or Long Rest." },
  "Piercing|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["piercing"] }, notes: "Resistance to Piercing until you choose another type after a Short or Long Rest." },
  "Poison|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["poison"] }, notes: "Resistance to Poison until you choose another type after a Short or Long Rest." },
  "Psychic|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["psychic"] }, notes: "Resistance to Psychic until you choose another type after a Short or Long Rest." },
  "Radiant|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["radiant"] }, notes: "Resistance to Radiant until you choose another type after a Short or Long Rest." },
  "Slashing|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["slashing"] }, notes: "Resistance to Slashing until you choose another type after a Short or Long Rest." },
  "Thunder|Fiendish Resilience": { owner: "Fiendish Resilience", kind: "passive", mods: { resist: ["thunder"] }, notes: "Resistance to Thunder until you choose another type after a Short or Long Rest." },

  // ====================================================================== SORCERER (remaining shared-name entry)
  "Choose a Subclass|Sorcerer": { owner: "Sorcerer", combat: "none" }
});

// Limited uses that need a count by ability modifier or class level, or that are shared between entries.
// Fixed counts (1 or 2 uses) live on the entries as usesFlat plus rest.
window.RESOURCE_POOLS = Object.assign(window.RESOURCE_POOLS || {}, {
  "Arcane Recovery":       { owner: "Wizard", formula: 1, rest: { short: "none", long: "all" } },
  "Sorcerous Restoration": { owner: "Sorcerer", formula: 1, rest: { short: "none", long: "all" } },
  "Signature Spells":      { owner: "Wizard", formula: 2, rest: { short: "all", long: "all" } },
  "Portent":               { owner: "Diviner", byLevel: { 3: 2, 14: 3 }, rest: { short: "none", long: "all" } },
  "Healing Light":         { owner: "Celestial Patron", pool: true, rest: { short: "none", long: "all" },
    byLevel: { 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 13, 13: 14, 14: 15, 15: 16, 16: 17, 17: 18, 18: 19, 19: 20, 20: 21 } },
  "Steps of the Fey":      { owner: "Archfey Patron", formula: "CHA_MIN1", rest: { short: "none", long: "all" } },
  "Dark One's Own Luck":   { owner: "Fiend Patron", formula: "CHA_MIN1", rest: { short: "none", long: "all" } },
  "Restore Balance":       { owner: "Clockwork Sorcery", formula: "CHA_MIN1", rest: { short: "none", long: "all" } }
});

// Structured recharge for the RESOURCE_USES entries these classes own.
window.RESOURCE_REST = Object.assign(window.RESOURCE_REST || {}, {
  "Bardic Inspiration": { short: "none", long: "all", shortFrom: { owner: "Bard", level: 5, short: "all" } },
  "Font of Magic":      { short: "none", long: "all" }
});
/* ============================================================================================================
   data/fx/actions_divine.js : combat effects for Cleric, Paladin, Druid and Ranger  (docs/Combat_Schema.md, B and C)

   ALLY QA FIX (tests/suites/ally.js): Nature's Sanctuary and Smite of Protection had target "allies" and no `n` (Nature's Sanctuary
   also has an area), so the engine (effectSteps counts only `n`) reached ONE creature. Both now carry n: 4 (a full party). Combat_Schema A:
   "allies" goes with `n`.

   SCOPE
   Every feature of Cleric, Paladin, Druid and Ranger and of their subclasses in data/data_classes_*.js (Life, Light,
   Trickery and War Domains; Devotion, Glory, Ancients and Vengeance; Land, Moon, Sea and Stars; Beast Master, Fey
   Wanderer, Gloom Stalker and Hunter), plus every option of these option features in data/data_options.js: Divine
   Order, Blessed Strikes, Primal Order, Elemental Fury, Hunter's Prey, Defensive Tactics, Primal Companion and
   Circle of the Land Spells. Also RESOURCE_REST for Channel Divinity, Wild Shape, Lay On Hands and Divine
   Intervention, and RESOURCE_POOLS for the other limited uses (WIS or CHA modifier uses per Long Rest and so on).
   Migrated and re-verified from the Cleric, Paladin, Druid and Ranger entries of data/data_class_actions.js.

   SOURCES (fetched 13 Oct 2026; 2024 rules only)
   1. dnd2024.wikidot.com: class and subclass pages for all four classes and all 16 subclasses.
   2. SRD 5.2.1 through the open5e v2 API (document__key=srd-2024): Cleric and Life Domain, Paladin and Oath of
      Devotion, Druid and Circle of the Land, Ranger and Hunter. Compared paragraph by paragraph with source 1.
   3. 5etools XPHB class data (github 5etools-mirror-3, data/class/class-*.json and bestiary-xphb.json): every class
      and subclass feature compared paragraph by paragraph with source 1; the Beast of the Land, Sea and Sky stat
      blocks come from here and from source 1.
   The three sources agree on every number used below. Differences from data/data_*.js are listed in the report.

   WHAT THE ENGINE ALREADY DOES (no entries here, per the contract)
   Spellcasting, Extra Attack, Weapon Mastery, Fighting Style (including Blessed Warrior and Druidic Warrior),
   Ability Score Improvement, Epic Boon, Subclass Feature, Radiant Strikes, Divine Strike (2d8 from Cleric 14),
   Primal Strike (2d8 from Druid 15). Also applied outside this file, so they carry combat:"none" or "zones" here to
   avoid counting twice: Protector and Warden (gear engine: armor and weapon training), Roving and Aura of Alacrity
   (gear engine: speed), Iron Mind (SAVE_PROF_FEATURES), the Gloom Stalker Initiative bonus and Darkvision (sheet),
   and the Hunter's Mark rider that the gear engine adds for Favored Enemy in damage estimates.

   CONVENTIONS USED THAT GO BEYOND THE CONTRACT TEXT (each is also listed in the report)
   - Variant keys "Name|Owner|Variant". A feature that offers several separate actions gets its main action under
     "Name" or "Name|Owner" and each further action under "Name|Owner|Variant" (Turn Undead, Starry Form constellations,
     Cosmic Omen Weal and Woe, Shield of Faith under War God's Blessing, Mass Fear, and so on). The validator only
     reads the part before the first "|". The engine must look these up by prefix. A variant that depends on an
     option the character chose is named after that option (Improved Blessed Strikes|Cleric|Potent Spellcasting).
   - Dice counts taken from a modifier are written "MOD_WISd8": plain token replacement gives "3d8". The engine
     must make it at least 1 die (Sear Undead, Wrath of the Sea).
   - "n" may be a token ("MOD_CHA" for Abjure Foes); the rule's minimum of 1 is not enforced by the token.
   - until:"nextHit" is used for "ends when the creature takes damage" (Turn Undead, Abjure Foes, Avenging Angel).
     Damage that is not an attack hit (spells, saves, auras) should end it too; the 1-minute cap is not tracked.
   - A reaction that changes one roll (Warding Flare, Shadowy Dodge) has mods and no "until": the change applies to
     the triggering roll only.
   - combat:"zones" marks features that only move or place creatures, or change vision or light.
     Zone data (Combat_Schema F.2) reviewed: none of the seven combat:"zones" entries (Trickster's Transposition, Aura Expansion,
     Relentless Avenger, Aquatic Affinity, Feral Senses, Umbral Sight, Escape the Horde) can become kind "move" or "zone". They
     are an illusion swap, an aura radius, a rider on an Opportunity Attack, a Swim Speed, vision, or a passive Opportunity
     Attack rule. They stay combat:"zones" for the engine to read by name.
   - A pool's rest may carry shortFrom, as RESOURCE_REST does (Warding Flare returns on a Short Rest from Cleric 6).
   - An entry with combat:"todo" has no kind. Where part of a feature is modelled in another key, or by the engine,
     its notes say which part is left.
   - Names that several classes share are keyed "Name|Owner" (Channel Divinity, Choose a Subclass, Expertise).

   SIMPLIFICATIONS (everything not listed here is modelled as written)
   - Wild Shape: only the temporary hit points are modelled (Druid level; three times that for Circle Forms). The
     Beast stat block (AC, speeds, attacks, senses), the no-spellcasting rule, form limits and duration are not.
     Circle Forms adds acMin 13 + WIS as the nearest fit to "AC is 13 + WIS if higher than the Beast's".
   - Primal Companion beasts: Beast's Strike as a summon attack with the 2024 numbers (modifier plus WIS modifier).
     The Land beast's 20-foot charge bonus (1d6 and Prone) needs movement and is not modelled. AC and hit points
     are kept for Phase 2. The beast's Dodge, Dash and the command rules are described in notes only.
   - Auras (Protection, Courage, Devotion, Warding): the mods are the owner's, with the range in notes (10 ft, 30 ft
     from Paladin 18). Allies get them only once the engine applies aura mods to allies in range.
   - Half cover (Smite of Protection, Nature's Sanctuary) is +2 AC only; the +2 on Dexterity saves is not modelled.
   - Vow of Enmity: advantage is given to attackers against the vowed creature (attackersAdv), so allies would
     benefit too; the rule gives it to the Paladin only. Transfer on a kill is not modelled.
   - Colossus Slayer applies on any weapon hit once per turn; the rule needs the target to be missing hit points.
   - Dreadful Strikes: once per turn instead of once per turn per target.
   - Potent Spellcasting: a flat bonus on spell damage; the rule limits it to Cleric (or Druid) cantrips.
   - Invoke Duplicity: advantage on all attack rolls for the duration; the rule needs the target within 5 ft of both
     you and the illusion, and a Bonus Action to move the illusion.
   - Moonlight Step's teleport and Dread Ambusher's first-turn Speed are positioning only; the Advantage from
     Moonlight Step is modelled for the whole turn, not just the next attack roll.
   - Warding Flare, Guided Strike and Cosmic Omen: the trigger list has no "ally is about to roll" or "ally missed",
     so only your own and enemy rolls are triggers; notes say what an ally use needs.
   - "Restore the use with a level 5 slot" (Oath capstones) and "regain uses with a slot" (Moonlight Step, Wild
     Resurgence) are described in notes; the engine has no slot-cost field.
   - Ends-on-damage effects use until:"nextHit". Hours-long and 10-minute durations become "rounds:100" (a fight).
   ============================================================================================================ */

window.RESOURCE_POOLS = Object.assign(window.RESOURCE_POOLS || {}, {
  // Cleric subclasses
  "Warding Flare":    { owner: "Light Domain", formula: "WIS_MIN1", rest: { short: "none", long: "all", shortFrom: { owner: "Cleric", level: 6, short: "all" } } },
  "Corona of Light":  { owner: "Light Domain", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  "War Priest":       { owner: "War Domain", formula: "WIS_MIN1", rest: { short: "all", long: "all" } },
  // Paladin subclasses
  "Glorious Defense": { owner: "Oath of Glory", formula: "CHA_MIN1", rest: { short: "none", long: "all" } },
  // Druid subclasses
  "Moonlight Step":   { owner: "Circle of the Moon", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  "Star Map":         { owner: "Circle of the Stars", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  "Cosmic Omen":      { owner: "Circle of the Stars", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  // Ranger and subclasses
  "Tireless":         { owner: "Ranger", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  "Nature's Veil":    { owner: "Ranger", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  "Dreadful Strike":  { owner: "Gloom Stalker", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  "Misty Wanderer":   { owner: "Fey Wanderer", formula: "WIS_MIN1", rest: { short: "none", long: "all" } }
});

window.RESOURCE_REST = Object.assign(window.RESOURCE_REST || {}, {
  // 2024: regain one use on a Short Rest, all on a Long Rest (Cleric 2/3/4 uses, Paladin 2/3 uses)
  "Channel Divinity":    { short: "one", long: "all" },
  // 2024: regain one use on a Short Rest, all on a Long Rest
  "Wild Shape":          { short: "one", long: "all" },
  "Lay On Hands":        { short: "none", long: "all" },
  "Divine Intervention": { short: "none", long: "all" }
});

window.ACTION_FX = Object.assign(window.ACTION_FX || {}, {

  /* ======================================================================================== CLERIC */
  "Divine Order": { owner: "Cleric", combat: "none",
    notes: "Choice only; the two options are Protector and Thaumaturge below." },
  "Protector": { owner: "Divine Order", combat: "none",
    notes: "Martial weapon proficiency and Heavy armor training are read by the gear engine from the chosen option." },
  "Thaumaturge": { owner: "Divine Order", combat: "exploration",
    notes: "One extra Cleric cantrip (a spell pick) and a WIS modifier bonus (min +1) to Arcana and Religion checks." },

  "Channel Divinity|Cleric": { owner: "Cleric", kind: "heal-or-damage", econ: "action", uses: "Channel Divinity",
    target: "creature", range: 30, ability: "WIS",
    heal: "1d8+MOD", save: "CON", dc: "SPELL", half: true, dmg: [{ dice: "1d8+MOD", type: ["necrotic", "radiant"] }],
    diceByLevel: { 2: 1, 7: 2, 13: 3, 18: 4 },
    notes: "Divine Spark (Magic action): choose heal, or damage with a CON save for half. Target is another creature you can see within 30 ft, so you can't heal yourself with it. The damage type is your choice each use. Turn Undead is the |Turn Undead key. Life Domain's Supreme Healing maximises the heal dice (todo there)." },
  "Channel Divinity|Cleric|Turn Undead": { owner: "Cleric", kind: "save-effect", econ: "action", uses: "Channel Divinity",
    target: "area", area: { shape: "emanation", size: 30 }, types: ["Undead"], save: "WIS", dc: "SPELL",
    onFail: [{ cond: "frightened", until: "nextHit" }, { cond: "incapacitated", until: "nextHit" }],
    notes: "Each Undead of your choice within 30 ft. Frightened and Incapacitated for 1 minute; ends early if the creature takes any damage or you are Incapacitated or die. Modelled as ending on the next hit. It also tries to move away from you; not modelled." },
  "Choose a Subclass|Cleric": { owner: "Cleric", combat: "none" },
  "Sear Undead": { owner: "Cleric", kind: "save-effect", econ: "action", uses: "Channel Divinity",
    target: "area", area: { shape: "emanation", size: 30 }, types: ["Undead"], save: "WIS", dc: "SPELL", ability: "WIS",
    dmg: [{ dice: "MOD_WISd8", type: "radiant" }],
    onFail: [{ cond: "frightened", until: "nextHit" }, { cond: "incapacitated", until: "nextHit" }],
    replaces: "Channel Divinity|Cleric|Turn Undead",
    notes: "Turn Undead from Cleric 5. Each Undead that fails also takes radiant damage from one roll of WIS-modifier d8s (minimum 1d8); the damage does not end the effect, so the engine should not end 'nextHit' on this damage." },

  "Blessed Strikes": { owner: "Cleric", combat: "none",
    notes: "Choice only. Divine Strike is an engine rule (1d8, 2d8 from Cleric 14). Potent Spellcasting is below." },
  "Potent Spellcasting|Blessed Strikes": { owner: "Blessed Strikes", kind: "passive", ability: "WIS",
    mods: { dmgFlat: { n: "MOD_WIS", on: "spell" } },
    notes: "Add the WIS modifier to the damage of Cleric cantrips only (Sacred Flame, Toll the Dead, Word of Radiance and so on), including save-based ones, on each damage roll. The engine must restrict 'on: spell' to cantrips." },
  "Improved Blessed Strikes": { owner: "Cleric", combat: "todo",
    notes: "Divine Strike's 2d8 is handled by the engine's Divine Strike rule. Potent Spellcasting's temporary hit points are the |Cleric|Potent Spellcasting variant key, which only applies if that option was chosen." },
  "Improved Blessed Strikes|Cleric|Potent Spellcasting": { owner: "Cleric", kind: "temphp", econ: "free", target: "creature", range: 60,
    ability: "WIS", temp: "MOD_WIS+MOD_WIS", once: "turn",
    notes: "When a Cleric cantrip deals damage to a creature, you or another creature within 60 ft gains temporary hit points equal to twice your WIS modifier. Needs a hook on 'a Cleric cantrip dealt damage'; once per cantrip cast." },

  "Divine Intervention": { owner: "Cleric", kind: "special", econ: "action", uses: "Divine Intervention",
    notes: "Magic action: cast any Cleric spell of level 5 or lower that doesn't need a Reaction, with no slot and no Material component. Engine: open a picker of Cleric spells up to level 5 (no Reaction spells) and cast the pick free. Once per Long Rest." },
  "Greater Divine Intervention": { owner: "Cleric", combat: "todo", econ: "action", uses: "Divine Intervention",
    notes: "Divine Intervention may pick Wish; then it can't be used again until 2d4 Long Rests have passed. The fight engine has no multi-rest lockout. What Wish does in a fight is up to its SPELL_FX entry." },

  /* ---- Life Domain */
  "Disciple of Life": { owner: "Life Domain", combat: "todo",
    notes: "A spell cast with a slot that restores HP restores 2 + the slot level more, on the same turn. Needs a bonus on slot-cast healing spells that knows the slot level used." },
  "Preserve Life": { owner: "Life Domain", kind: "heal", econ: "action", uses: "Channel Divinity",
    target: "allies", range: 30, heal: "CLASS_LEVEL*5",
    notes: "Magic action. The heal value is a pool: five times Cleric level, divided as you like among Bloodied creatures within 30 ft (you included), and no creature goes above half its HP maximum." },
  "Blessed Healer": { owner: "Life Domain", combat: "todo",
    notes: "After you cast a slot spell that heals one or more creatures other than you, you regain 2 + the slot level HP. Needs a trigger on 'you cast a healing spell on another creature' that knows the slot level." },
  "Supreme Healing": { owner: "Life Domain", combat: "todo",
    notes: "Healing dice from spells and Channel Divinity (Divine Spark) are maximised instead of rolled. Needs a 'maximise healing dice' flag read by the heal roller." },

  /* ---- Light Domain */
  "Radiance of the Dawn": { owner: "Light Domain", kind: "save-effect", econ: "action", uses: "Channel Divinity",
    target: "area", area: { shape: "emanation", size: 30 }, save: "CON", dc: "SPELL", half: true,
    dmg: [{ dice: "2d10+CLASS_LEVEL", type: "radiant" }],
    notes: "Creatures of your choice in the emanation. It also dispels magical Darkness in the area; not modelled." },
  "Warding Flare": { owner: "Light Domain", kind: "reaction", trigger: "attackRoll", econ: "reaction", uses: "Warding Flare",
    target: "enemy", range: 30, mods: { atkDis: true },
    notes: "A creature you can see within 30 ft makes an attack roll: Disadvantage on that one roll (no 'until' on purpose). Uses are your WIS modifier (min 1) per Long Rest." },
  "Improved Warding Flare": { owner: "Light Domain", kind: "reaction", trigger: "attackRoll", econ: "reaction", uses: "Warding Flare",
    target: "enemy", range: 30, mods: { atkDis: true }, temp: "2d6+MOD_WIS", ability: "WIS", replaces: "Warding Flare",
    notes: "As Warding Flare, and the target of the triggering attack (you or an ally) gains 2d6 + WIS modifier temporary hit points. The pool recharges on a Short Rest from Cleric 6 (see RESOURCE_POOLS)." },
  "Corona of Light": { owner: "Light Domain", combat: "todo", econ: "action", uses: "Corona of Light",
    notes: "Magic action, 1 minute (or dismissed): enemies in the 60-ft Bright Light have Disadvantage on saves against Radiance of the Dawn and any spell that deals Fire or Radiant damage. Needs a modifier on enemies' saves that depends on the source's damage type or feature." },

  /* ---- Trickery Domain */
  "Blessing of the Trickster": { owner: "Trickery Domain", combat: "exploration",
    notes: "Advantage on Stealth checks for you or a willing creature within 30 ft until a Long Rest." },
  "Invoke Duplicity": { owner: "Trickery Domain", kind: "toggle", econ: "bonus", uses: "Channel Divinity", until: "rounds:10",
    mods: { atkAdv: true },
    notes: "Creates an illusion of you for 1 minute. You have Advantage on attack rolls against a creature that can see the illusion while both of you are within 5 ft of it; modelled as Advantage on all your attack rolls. Moving the illusion is a Bonus Action. You can cast spells from its space. Ends if you are Incapacitated." },
  "Trickster's Transposition": { owner: "Trickery Domain", combat: "zones",
    notes: "When you create or move the illusion you can teleport to swap places with it." },
  "Improved Duplicity": { owner: "Trickery Domain", kind: "toggle", econ: "bonus", uses: "Channel Divinity", until: "rounds:10",
    target: "allies", mods: { atkAdv: true }, replaces: "Invoke Duplicity",
    notes: "You and your allies have Advantage on attacks against creatures within 5 ft of the illusion (modelled as all attacks). When the illusion ends, you or a creature within 5 ft of it regains HP equal to your Cleric level; not modelled." },

  /* ---- War Domain */
  "Guided Strike": { owner: "War Domain", kind: "reaction", trigger: "youMiss", econ: "free", uses: "Channel Divinity",
    target: "self", effect: { bonus: 10 },
    notes: "Add +10 to a missed attack roll. For a creature within 30 ft other than you it costs your Reaction (no trigger exists for 'an ally missed')." },
  "War Priest": { owner: "War Domain", kind: "extra-attacks", econ: "bonus", uses: "War Priest", n: 1, weapon: "any",
    notes: "Bonus Action: one attack with a weapon or an Unarmed Strike. Uses are your WIS modifier (min 1), regained on a Short or Long Rest." },
  "War God's Blessing": { owner: "War Domain", kind: "free-cast", spell: "Spiritual Weapon", econ: "bonus", uses: "Channel Divinity",
    conc: false, until: "rounds:10",
    notes: "Cast Spiritual Weapon with a Channel Divinity use instead of a slot. No Concentration: it lasts 1 minute and ends early if you cast it again, are Incapacitated or die. Shield of Faith is the |Shield of Faith key." },
  "War God's Blessing|War Domain|Shield of Faith": { owner: "War Domain", kind: "free-cast", spell: "Shield of Faith", econ: "bonus", uses: "Channel Divinity",
    conc: false, until: "rounds:10",
    notes: "As War God's Blessing: no Concentration, lasts 1 minute, ends early if you cast it again, are Incapacitated or die." },
  "Avatar of Battle": { owner: "War Domain", kind: "passive", mods: { resist: ["bludgeoning", "piercing", "slashing"] } },

  /* ======================================================================================== PALADIN */
  "Lay On Hands": { owner: "Paladin", kind: "heal", econ: "bonus", target: "creature", uses: "Lay On Hands", pool: "Lay On Hands",
    notes: "Touch. Spend any number of points from the pool as HP restored (up to the pool left), or 5 points to remove Poisoned instead of healing. The pool is five times Paladin level." },
  "Paladin's Smite": { owner: "Paladin", kind: "free-cast", spell: "Divine Smite", econ: "bonus", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Divine Smite once per Long Rest without a slot. Always prepared. Cast as a Bonus Action right after you hit." },
  "Channel Divinity|Paladin": { owner: "Paladin", combat: "exploration",
    notes: "Divine Sense (Bonus Action, 10 minutes): know where Celestials, Fiends and Undead are within 60 ft. Channel Divinity uses are spent by Abjure Foes and the Oath options." },
  "Choose a Subclass|Paladin": { owner: "Paladin", combat: "none" },
  "Faithful Steed": { owner: "Paladin", kind: "free-cast", spell: "Find Steed", econ: "action", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Find Steed once per Long Rest without a slot. Mounted combat is not in the engine; what the steed does is up to the spell's SPELL_FX." },
  "Aura of Protection": { owner: "Paladin", kind: "passive", fx: { saveBonus: "MOD_CHA" },
    notes: "You and allies in a 10-ft emanation add your CHA modifier (min +1) to saving throws; 30 ft from Paladin 18. Inactive while you are Incapacitated. A creature gets only one Paladin's aura. The sheet applies it to the owner; allies need the engine to apply it." },
  "Abjure Foes": { owner: "Paladin", kind: "save-effect", econ: "action", uses: "Channel Divinity", target: "enemy", n: "MOD_CHA", range: 60,
    save: "WIS", dc: "SPELL", onFail: [{ cond: "frightened", until: "nextHit" }],
    notes: "Targets: CHA modifier creatures (min 1) you can see within 60 ft. Frightened for 1 minute or until damaged. While Frightened this way a target can do only one of: move, take an action, take a Bonus Action; that cap is not modelled." },
  "Aura of Courage": { owner: "Paladin", kind: "passive", mods: { condImmune: ["frightened"] },
    notes: "You and allies in your Aura of Protection are immune to Frightened; a Frightened ally entering the aura loses the effect while there. Range follows the aura." },
  "Restoring Touch": { owner: "Paladin", kind: "special", econ: "bonus", cost: { pool: "Lay On Hands", n: 5 },
    notes: "Part of a Lay On Hands use: also remove Blinded, Charmed, Deafened, Frightened, Paralyzed or Stunned from the creature, 5 pool points per condition removed (the points heal nothing)." },
  "Aura Expansion": { owner: "Paladin", combat: "zones", notes: "Aura of Protection becomes a 30-ft emanation." },

  /* ---- Oath of Devotion */
  "Sacred Weapon": { owner: "Oath of Devotion", kind: "toggle", econ: "free", uses: "Channel Divinity", until: "rounds:100", ability: "CHA",
    mods: { atk: "MOD_CHA" },
    notes: "When you take the Attack action. One melee weapon you hold, 10 minutes: add CHA modifier (min +1) to its attack rolls; each hit may deal its normal type or Radiant; sheds 20 ft Bright Light and 20 ft Dim Light. Ends if you stop carrying it." },
  "Aura of Devotion": { owner: "Oath of Devotion", kind: "passive", mods: { condImmune: ["charmed"] },
    notes: "You and allies in your Aura of Protection are immune to Charmed." },
  "Smite of Protection": { owner: "Oath of Devotion", kind: "buff", econ: "none", trigger: "youHit", target: "allies", n: 4, mods: { ac: 2 }, until: "srcTurnStart",
    notes: "Whenever you cast Divine Smite, you and allies in your Aura of Protection have Half Cover until the start of your next turn: +2 AC and +2 DEX saves (only AC is modelled). The engine should fire it when Divine Smite is cast." },
  "Holy Nimbus": { owner: "Oath of Devotion", kind: "aura", econ: "bonus", usesFlat: 1, rest: { short: "none", long: "all" },
    target: "area", area: { shape: "emanation", size: 30 }, ability: "CHA", dmg: [{ dice: "MOD_CHA+PB", type: "radiant" }], until: "rounds:100",
    notes: "10 minutes. An enemy that starts its turn in the aura takes the damage (no save). You have Advantage on saves forced by Fiends and Undead (not modelled: no creature-type qualifier on saveAdv). The aura is sunlight. Also restorable by expending a level 5 slot (not modelled)." },

  /* ---- Oath of Glory */
  "Inspiring Smite": { owner: "Oath of Glory", kind: "temphp", econ: "free", trigger: "youHit", uses: "Channel Divinity",
    target: "allies", range: 30, temp: "2d8+CLASS_LEVEL",
    notes: "Immediately after you cast Divine Smite. The total is divided among creatures of your choice within 30 ft, you included." },
  "Peerless Athlete": { owner: "Oath of Glory", combat: "exploration",
    notes: "Bonus Action, 1 hour: Advantage on Athletics and Acrobatics checks, +10 ft Long and High Jump. Matters in a fight only if shoving and grappling contests are modelled." },
  "Aura of Alacrity": { owner: "Oath of Glory", combat: "none",
    notes: "Your own +10 ft Speed is applied by the gear engine. Allies entering or starting in your aura gain +10 ft until the end of their next turn: zone movement." },
  "Glorious Defense": { owner: "Oath of Glory", kind: "reaction", trigger: "hit", econ: "reaction", uses: "Glorious Defense",
    target: "self", range: 10, mods: { ac: "MOD_CHA" },
    notes: "When you or a creature you can see within 10 ft is hit, add CHA modifier (min +1) to its AC against that attack; the bonus applies to that one attack only (no 'until' modelled). If the attack now misses, make one weapon attack against the attacker as part of the Reaction: not modelled (the contract has no free retaliation attack). Uses are your CHA modifier (min 1) per Long Rest. Allies need an 'ally was hit' trigger." },
  "Living Legend": { owner: "Oath of Glory", kind: "toggle", econ: "bonus", usesFlat: 1, rest: { short: "none", long: "all" }, until: "rounds:100",
    mods: { checkAdv: ["CHA"] },
    notes: "10 minutes. Modelled: Advantage on Charisma checks. Not modelled: once per turn, an attack roll that misses with a weapon becomes a hit; a Reaction to reroll a failed saving throw (use the new roll). Both need effects that only run while this toggle is on. A level 5 slot restores the use (not modelled)." },

  /* ---- Oath of the Ancients */
  "Nature's Wrath": { owner: "Oath of the Ancients", kind: "save-effect", econ: "action", uses: "Channel Divinity",
    target: "area", area: { shape: "emanation", size: 15 }, save: "STR", dc: "SPELL",
    onFail: [{ cond: "restrained", until: "rounds:10", repeat: "end" }],
    notes: "Creatures of your choice that you can see within 15 ft. Restrained for 1 minute; the save repeats at the end of each of its turns." },
  "Aura of Warding": { owner: "Oath of the Ancients", kind: "passive", mods: { resist: ["necrotic", "psychic", "radiant"] },
    notes: "You and allies in your Aura of Protection have Resistance to these types." },
  "Undying Sentinel": { owner: "Oath of the Ancients", kind: "reaction", trigger: "zero", econ: "none", usesFlat: 1, rest: { short: "none", long: "all" },
    effect: { survive: true, hpOnSurvive: "CLASS_LEVEL*3+1" },
    notes: "Reduced to 0 HP and not killed outright: drop to 1 HP instead, then regain three times Paladin level HP (so hpOnSurvive is 1 + 3 x level, capped at your maximum). You also can't be aged magically." },
  "Elder Champion": { owner: "Oath of the Ancients", kind: "toggle", econ: "bonus", usesFlat: 1, rest: { short: "none", long: "all" }, until: "rounds:10",
    mods: { regen: 10 },
    notes: "1 minute. Modelled: regain 10 HP at the start of each of your turns. Not modelled: spells with a casting time of one action can be cast as a Bonus Action; enemies in your aura have Disadvantage on saves against your spells and Channel Divinity options (needs a source-dependent save modifier on enemies). A level 5 slot restores the use (not modelled)." },

  /* ---- Oath of Vengeance */
  "Vow of Enmity": { owner: "Oath of Vengeance", kind: "debuff", econ: "free", uses: "Channel Divinity", target: "enemy", range: 30,
    mods: { attackersAdv: true }, until: "rounds:10",
    notes: "When you take the Attack action. You have Advantage on attack rolls against one creature you can see within 30 ft for 1 minute or until you use it again. Modelled as attack rolls against it having Advantage (allies benefit too; the rule is yours only). If it drops to 0 HP, the vow moves free to another creature within 30 ft (not modelled)." },
  "Relentless Avenger": { owner: "Oath of Vengeance", combat: "zones",
    notes: "When your Opportunity Attack hits: the target's Speed is 0 until the end of the current turn, then you move up to half your Speed without provoking, as part of the same Reaction." },
  "Soul of Vengeance": { owner: "Oath of Vengeance", kind: "reaction", trigger: "attacked", econ: "reaction", target: "enemy", weapon: "melee",
    notes: "Immediately after a creature under your Vow of Enmity hits or misses with an attack roll, make one melee attack against it if it is in reach. The trigger is after the roll; the list has only 'before the roll' (attacked). Works only while a vow is active." },
  "Avenging Angel": { owner: "Oath of Vengeance", kind: "aura", econ: "bonus", usesFlat: 1, rest: { short: "none", long: "all" },
    target: "area", area: { shape: "emanation", size: 30 }, save: "WIS", dc: "SPELL", until: "rounds:100",
    onFail: [{ cond: "frightened", until: "nextHit" }, { mod: { attackersAdv: true }, until: "nextHit" }],
    notes: "10 minutes. An enemy that starts its turn in the aura makes the save or is Frightened for 1 minute or until it takes damage; attack rolls against it have Advantage. You also have a 60-ft Fly Speed and can hover (zones). A level 5 slot restores the use (not modelled)." },

  /* ======================================================================================== DRUID */
  "Druidic": { owner: "Druid", combat: "exploration", notes: "The Druidic language and hidden messages; Speak with Animals is always prepared." },
  "Primal Order": { owner: "Druid", combat: "none", notes: "Choice only; the two options are Magician and Warden below." },
  "Magician": { owner: "Primal Order", combat: "exploration",
    notes: "One extra Druid cantrip (a spell pick) and a WIS modifier bonus (min +1) to Arcana and Nature checks." },
  "Warden": { owner: "Primal Order", combat: "none",
    notes: "Martial weapon proficiency and Medium armor training are read by the gear engine from the chosen option." },

  "Wild Shape": { owner: "Druid", kind: "temphp", econ: "bonus", uses: "Wild Shape", target: "self", temp: "CLASS_LEVEL",
    notes: "2024: shifting into a known Beast form grants temporary hit points equal to Druid level; you keep your own HP pool. Only that is modelled. Not modelled: the form's stat block (AC, speeds, attacks, senses), no spellcasting while shifted (lifted by Beast Spells at 18 and for the Moon's circle spells), 4 / 6 / 8 known forms with max CR 1/4, 1/2, 1 and flight from level 8, the duration (hours equal to half Druid level), leaving the form as a Bonus Action. The bestiary has the Beast stat blocks if the engine later swaps the sheet." },
  "Wild Companion": { owner: "Druid", kind: "free-cast", spell: "Find Familiar", econ: "action", uses: "Wild Shape",
    notes: "Magic action: expend a Wild Shape use (or a spell slot, not modelled) to cast Find Familiar without Material components. It is cast as a Magic action, not the spell's 1-hour time. The familiar is a Fey and disappears on a Long Rest." },
  "Choose a Subclass|Druid": { owner: "Druid", combat: "none" },
  "Wild Resurgence": { owner: "Druid", kind: "convert", econ: "free", cost: { pool: "Wild Shape", n: 1 }, usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "No action: expend a Wild Shape use to gain one level 1 spell slot, once per Long Rest. The other half (a slot for a Wild Shape use) is the |Slot For Use key." },
  "Wild Resurgence|Druid|Slot For Use": { owner: "Druid", combat: "todo", econ: "free", once: "turn",
    notes: "Once on each of your turns, if you have no Wild Shape uses left, expend a spell slot (any level) to regain one use. The contract has no way to spend a spell slot as a cost." },

  "Elemental Fury": { owner: "Druid", combat: "none",
    notes: "Choice only. Primal Strike is an engine rule (1d8, 2d8 from Druid 15; it also applies to Wild Shape attacks). Potent Spellcasting is below." },
  "Potent Spellcasting|Elemental Fury": { owner: "Elemental Fury", kind: "passive", ability: "WIS",
    mods: { dmgFlat: { n: "MOD_WIS", on: "spell" } },
    notes: "Add the WIS modifier to the damage of Druid cantrips only (Produce Flame, Thorn Whip, Starry Wisp, Thunderclap, Frostbite and so on), including save-based ones. The engine must restrict 'on: spell' to cantrips." },
  "Improved Elemental Fury": { owner: "Druid", combat: "none",
    notes: "Primal Strike's 2d8 is handled by the engine. Potent Spellcasting's +300 ft range on Druid cantrips with a range of 10 ft or more only matters with positioning." },
  "Beast Spells": { owner: "Druid", combat: "todo",
    notes: "Cast spells while in Wild Shape, except spells with a costed or consumed Material component. Only relevant once the engine blocks spellcasting in a Wild Shape form." },
  "Archdruid": { owner: "Druid", combat: "todo",
    notes: "Evergreen Wild Shape: roll Initiative with no Wild Shape uses left and regain one (the contract has no Initiative trigger). Nature Magician: once per Long Rest, no action, convert unexpended Wild Shape uses into one spell slot at 2 spell levels per use (no slot-creation effect except 'convert'). Longevity is flavour." },

  /* ---- Circle of the Land */
  "Circle of the Land Spells": { owner: "Circle of the Land", combat: "none",
    notes: "On each Long Rest choose Arid, Polar, Temperate or Tropical; the spells of that land (listed by Druid level in the feature text) are prepared. The data has no structured spell list for these; the engine can't prepare them or read their SPELL_FX. The land also sets Nature's Ward (options below)." },
  "Arid": { owner: "Circle of the Land Spells", minLevel: 10, kind: "passive", mods: { resist: ["fire"] },
    notes: "Nature's Ward (level 10) gives Resistance to Fire for this land. Circle spells: Blur, Burning Hands, Fire Bolt (3); Fireball (5); Blight (7); Wall of Stone (9)." },
  "Polar": { owner: "Circle of the Land Spells", minLevel: 10, kind: "passive", mods: { resist: ["cold"] },
    notes: "Nature's Ward (level 10) gives Resistance to Cold for this land. Circle spells: Fog Cloud, Hold Person, Ray of Frost (3); Sleet Storm (5); Ice Storm (7); Cone of Cold (9)." },
  "Temperate": { owner: "Circle of the Land Spells", minLevel: 10, kind: "passive", mods: { resist: ["lightning"] },
    notes: "Nature's Ward (level 10) gives Resistance to Lightning for this land. Circle spells: Misty Step, Shocking Grasp, Sleep (3); Lightning Bolt (5); Freedom of Movement (7); Tree Stride (9)." },
  "Tropical": { owner: "Circle of the Land Spells", minLevel: 10, kind: "passive", mods: { resist: ["poison"] },
    notes: "Nature's Ward (level 10) gives Resistance to Poison for this land. Circle spells: Acid Splash, Ray of Sickness, Web (3); Stinking Cloud (5); Polymorph (7); Insect Plague (9)." },
  "Land's Aid": { owner: "Circle of the Land", kind: "save-effect", econ: "action", uses: "Wild Shape",
    target: "area", area: { shape: "sphere", size: 10 }, range: 60, save: "CON", dc: "SPELL", half: true,
    dmg: [{ dice: "2d6", type: "necrotic" }], heal: "2d6", diceByLevel: { 3: 2, 10: 3, 14: 4 },
    notes: "Magic action. Creatures of your choice in the sphere take the damage (half on a success); one creature of your choice there, you included, regains the same dice in HP. Both rise by 1d6 at Druid 10 and 14." },
  "Natural Recovery": { owner: "Circle of the Land", kind: "special", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Cast one prepared level 1+ Circle spell without a slot, once per Long Rest (casting time of that spell). The second half, recovering slots on a Short Rest (combined level up to half Druid level, none level 6+, once per Long Rest), is rest-time and isn't a fight action." },
  "Nature's Ward": { owner: "Circle of the Land", kind: "passive", mods: { condImmune: ["poisoned"] },
    notes: "Immune to Poisoned. The Resistance for your land is on the Arid, Polar, Temperate and Tropical options." },
  "Nature's Sanctuary": { owner: "Circle of the Land", kind: "buff", econ: "action", uses: "Wild Shape", target: "allies", n: 4, range: 120,
    area: { shape: "cube", size: 15 }, mods: { ac: 2 }, until: "rounds:10",
    notes: "1 minute; you and allies in the cube have Half Cover (+2 AC and +2 DEX saves; only AC modelled), and allies also gain the Resistance of your current Nature's Ward (not modelled). Bonus Action to move the cube up to 60 ft. Ends if you are Incapacitated or die." },

  /* ---- Circle of the Moon */
  "Circle Forms": { owner: "Circle of the Moon", kind: "temphp", econ: "bonus", uses: "Wild Shape", target: "self", temp: "CLASS_LEVEL*3",
    mods: { acMin: "13+MOD_WIS" }, until: "fight", replaces: "Wild Shape",
    notes: "Wild Shape with three times Druid level temporary hit points. AC is 13 + WIS if higher than the Beast's (acMin is the nearest fit; the Beast's AC itself is not modelled). Max CR is Druid level divided by 3, rounded down. Other Wild Shape limits as in the Wild Shape entry." },
  "Circle of the Moon Spells": { owner: "Circle of the Moon", combat: "none",
    notes: "Always-prepared spells (bonusSpells data). They can be cast while in a Wild Shape form (see Beast Spells)." },
  "Improved Circle Forms": { owner: "Circle of the Moon", combat: "todo",
    notes: "In a Wild Shape form: each attack may deal Radiant instead of its normal type (a type switch, matters only against resistance), and you add your WIS modifier to Constitution saving throws. Needs a per-ability save bonus (CON only; the 'save' mod applies to every save) that runs while Wild Shaped." },
  "Moonlight Step": { owner: "Circle of the Moon", kind: "buff", econ: "bonus", uses: "Moonlight Step", target: "self", mods: { atkAdv: true }, until: "turnEnd",
    notes: "Bonus Action: teleport up to 30 ft to a space you can see (zones) and have Advantage on the next attack roll you make this turn (modelled as all attack rolls this turn). Uses are your WIS modifier (min 1) per Long Rest; expend a level 2+ spell slot to regain one use (not modelled)." },
  "Lunar Form": { owner: "Circle of the Moon", combat: "todo",
    notes: "Once per turn, a hit with a Wild Shape form's attack deals an extra 2d10 Radiant damage. Needs a 'while Wild Shaped' state (dmgDie would apply it to weapon attacks too). Moonlight Step can also teleport a willing creature within 10 ft (zones)." },

  /* ---- Circle of the Sea */
  "Wrath of the Sea": { owner: "Circle of the Sea", kind: "toggle", econ: "bonus", uses: "Wild Shape", until: "rounds:100", ability: "WIS",
    target: "enemy", n: 1, save: "CON", dc: "SPELL", dmg: [{ dice: "MOD_WISd6", type: "cold" }], onFail: [{ push: 15, sizeMax: "Large" }],
    repeat: { econ: "bonus", save: "CON", dmg: [{ dice: "MOD_WISd6", type: "cold" }] },
    notes: "Bonus Action, 10 minutes: a 5-ft emanation of ocean spray around you. When you manifest it, and as a Bonus Action on later turns, one other creature you can see in it makes a CON save or takes cold damage from WIS-modifier d6s (min 1) and, if Large or smaller, is pushed up to 15 ft. The first blast comes with the activation; later blasts are the 'repeat'. Ends if dismissed, manifested again or you are Incapacitated." },
  "Aquatic Affinity": { owner: "Circle of the Sea", combat: "zones", notes: "Wrath of the Sea's emanation is 10 ft; you gain a Swim Speed equal to your Speed." },
  "Stormborn": { owner: "Circle of the Sea", kind: "toggle", econ: "bonus", uses: "Wild Shape", until: "rounds:100", ability: "WIS",
    target: "enemy", n: 1, save: "CON", dc: "SPELL", dmg: [{ dice: "MOD_WISd6", type: "cold" }], onFail: [{ push: 15, sizeMax: "Large" }],
    repeat: { econ: "bonus", save: "CON", dmg: [{ dice: "MOD_WISd6", type: "cold" }] },
    mods: { resist: ["cold", "lightning", "thunder"] }, replaces: "Wrath of the Sea",
    notes: "Wrath of the Sea while active also gives you Resistance to Cold, Lightning and Thunder and a Fly Speed equal to your Speed (zones)." },
  "Oceanic Gift": { owner: "Circle of the Sea", combat: "todo",
    notes: "Manifest Wrath of the Sea around one willing creature within 60 ft instead of yourself (it uses your save DC and WIS modifier and gets the benefits), or around both of you for two Wild Shape uses. Needs an ally-held effect that uses the owner's numbers." },

  /* ---- Circle of the Stars */
  "Star Map": { owner: "Circle of the Stars", kind: "free-cast", spell: "Guiding Bolt", econ: "action", uses: "Star Map",
    notes: "While holding the map: Guiding Bolt without a slot, WIS modifier (min 1) times per Long Rest. Guidance is also always prepared." },
  "Starry Form": { owner: "Circle of the Stars", kind: "toggle", econ: "bonus", uses: "Wild Shape", until: "rounds:100", ability: "WIS",
    atk: "SPELL", range: 60, dmg: [{ dice: "1d8+MOD", type: "radiant" }], diceByLevel: { 3: 1, 10: 2 },
    repeat: { econ: "bonus", atk: "SPELL", dmg: [{ dice: "1d8+MOD", type: "radiant" }] },
    notes: "Bonus Action, 10 minutes; you keep your stat block. This entry is the Archer constellation: when you activate it and as a Bonus Action on later turns, a ranged spell attack at 60 ft for 1d8 + WIS radiant (2d8 from Druid 10). Chalice and Dragon are the variant keys. From Druid 10 you may change constellation at the start of each turn (not modelled). Ends if dismissed, you are Incapacitated, or you use it again." },
  "Starry Form|Circle of the Stars|Chalice": { owner: "Circle of the Stars", combat: "todo",
    notes: "While Starry Form is active: whenever you cast a slot spell that restores HP, you or another creature within 30 ft also regains 1d8 + WIS HP (2d8 from Druid 10). Needs the same 'slot-cast heal' trigger as Disciple of Life." },
  "Starry Form|Circle of the Stars|Dragon": { owner: "Circle of the Stars", combat: "todo",
    notes: "While Starry Form is active: on Intelligence or Wisdom checks and on Constitution saves to keep Concentration, a d20 roll of 9 or lower counts as 10 (a floor, like Reliable Talent). From Druid 10 also a 20-ft hover Fly Speed. Needs a d20 floor for concentration saves." },
  "Cosmic Omen": { owner: "Circle of the Stars", combat: "todo",
    notes: "After each Long Rest roll a die: even gives Weal, odd gives Woe. The two Reactions are the |Weal and |Woe variant keys; the engine should roll once per Long Rest and offer only the one rolled. Uses are your WIS modifier (min 1) per Long Rest, shared." },
  "Cosmic Omen|Circle of the Stars|Weal": { owner: "Circle of the Stars", kind: "reaction", trigger: "attackRoll", econ: "reaction", uses: "Cosmic Omen",
    target: "ally", range: 30, effect: { bonus: "1d6" },
    notes: "Roll 1d6 and add it to the total of a D20 Test (attack, save or check) made by a creature you can see within 30 ft, you included. No trigger covers an ally's save or check, or 'about to roll'; 'bonus' as dice is new." },
  "Cosmic Omen|Circle of the Stars|Woe": { owner: "Circle of the Stars", kind: "reaction", trigger: "attackRoll", econ: "reaction", uses: "Cosmic Omen",
    target: "enemy", range: 30, effect: { subtract: "1d6" },
    notes: "Roll 1d6 and subtract it from the total of a D20 Test made by a creature you can see within 30 ft. The contract's trigger covers only attack rolls; enemy saves and checks need more triggers." },
  "Twinkling Constellations": { owner: "Circle of the Stars", combat: "none",
    notes: "Archer and Chalice become 2d8 (the diceByLevel in Starry Form already counts this); Dragon grants a 20-ft hover Fly Speed; you can change constellation at the start of each of your turns." },
  "Full of Stars": { owner: "Circle of the Stars", kind: "toggle", econ: "bonus", uses: "Wild Shape", until: "rounds:100", ability: "WIS",
    atk: "SPELL", range: 60, dmg: [{ dice: "1d8+MOD", type: "radiant" }], diceByLevel: { 3: 1, 10: 2 },
    repeat: { econ: "bonus", atk: "SPELL", dmg: [{ dice: "1d8+MOD", type: "radiant" }] },
    mods: { resist: ["bludgeoning", "piercing", "slashing"] }, replaces: "Starry Form",
    notes: "Starry Form (Archer shown) while active also gives Resistance to Bludgeoning, Piercing and Slashing (you are partly incorporeal)." },

  /* ======================================================================================== RANGER */
  "Favored Enemy": { owner: "Ranger", kind: "free-cast", spell: "Hunter's Mark", econ: "bonus",
    usesByLevel: { 1: 2, 5: 3, 9: 4, 13: 5, 17: 6 }, rest: { short: "none", long: "all" },
    notes: "Hunter's Mark is always prepared and can be cast without a slot 2 times (3 at 5, 4 at 9, 5 at 13, 6 at 17) per Long Rest." },
  "Deft Explorer": { owner: "Ranger", combat: "exploration", notes: "Expertise in one skill and two languages." },
  "Choose a Subclass|Ranger": { owner: "Ranger", combat: "none" },
  "Roving": { owner: "Ranger", combat: "none",
    notes: "+10 ft Speed while not in Heavy armor is applied by the gear engine. Climb and Swim Speeds equal to your Speed are zone movement." },
  "Expertise|Ranger": { owner: "Ranger", combat: "exploration", notes: "Expertise in two more skills." },
  "Tireless": { owner: "Ranger", kind: "temphp", econ: "action", uses: "Tireless", target: "self", ability: "WIS", temp: "1d8+MOD",
    notes: "Magic action: 1d8 + WIS modifier (min 1) temporary hit points, WIS modifier (min 1) times per Long Rest. Each Short Rest also removes one Exhaustion level (rest-time)." },
  "Relentless Hunter": { owner: "Ranger", combat: "todo",
    notes: "Taking damage can't break your Concentration on Hunter's Mark (no save). Needs a per-spell 'damage never breaks concentration' flag; 'concAdv' is advantage on every concentration save, which is not the same." },
  "Nature's Veil": { owner: "Ranger", kind: "buff", econ: "bonus", uses: "Nature's Veil", target: "self",
    mods: { attackersDis: true, atkAdv: true }, until: "srcTurnEnd",
    notes: "Bonus Action: the Invisible condition until the end of your next turn. Invisible is modelled as Disadvantage against you and Advantage on your attacks; creatures that see invisible or ignore it are not handled. WIS modifier (min 1) uses per Long Rest." },
  "Precise Hunter": { owner: "Ranger", combat: "todo",
    notes: "Advantage on attack rolls against the creature marked by your Hunter's Mark. Needs 'atkAdv' restricted to the marked target (only dmgDie has vs:'marked')." },
  "Feral Senses": { owner: "Ranger", combat: "zones", notes: "Blindsight 30 ft: matters with the Phase 2 vision rules." },
  "Foe Slayer": { owner: "Ranger", combat: "todo",
    notes: "Hunter's Mark's extra damage die becomes d10 instead of d6 (the gear engine's damage estimate already uses d10). Needs a die override on the spell's dmgDie; adding a second dmgDie would stack with the d6." },

  /* ---- Beast Master */
  "Primal Companion": { owner: "Beast Master", combat: "none",
    notes: "Choice and rules only; the three beasts are the options below. In combat the beast acts on your turn and only Dodges unless you use a Bonus Action to command it, or give up one of your attacks of the Attack action for Beast's Strike. If you are Incapacitated it acts on its own. It vanishes if you die. If it died within the last hour, a Magic action and a spell slot bring it back after 1 minute at full HP. After a Long Rest you can summon a different beast." },
  "Beast of the Land": { owner: "Primal Companion", kind: "summon", econ: "bonus", ability: "WIS", attacksByLevel: { 3: 1, 11: 2 },
    summon: { name: "Beast of the Land", econ: "bonus", atk: "SPELL", dmg: [{ dice: "1d8+2+MOD_WIS", type: ["bludgeoning", "piercing", "slashing"] }], ac: "13+MOD_WIS", hp: "5+CLASS_LEVEL*5" },
    notes: "Medium, Speed 40 ft and Climb 40 ft. Beast's Strike: spell attack, 1d8 + 2 + your WIS modifier, damage type chosen when summoned. If it moved 20 ft straight at the target first: +1d6 of the same type and Prone for Large or smaller (not modelled: movement). Hit dice d8 equal to your Ranger level. Strikes per command are in attacksByLevel (Bestial Fury at 11)." },
  "Beast of the Sea": { owner: "Primal Companion", kind: "summon", econ: "bonus", ability: "WIS", attacksByLevel: { 3: 1, 11: 2 },
    summon: { name: "Beast of the Sea", econ: "bonus", atk: "SPELL", dmg: [{ dice: "1d6+2+MOD_WIS", type: ["bludgeoning", "piercing"] }], ac: "13+MOD_WIS", hp: "5+CLASS_LEVEL*5" },
    onHit: [{ cond: "grappled", escape: "SPELL" }],
    notes: "Medium, Speed 5 ft and Swim 60 ft, amphibious. Beast's Strike: spell attack, 1d6 + 2 + your WIS modifier, Bludgeoning or Piercing chosen when summoned, and the target is Grappled (escape DC is your spell save DC). The grapple rider belongs to the beast's attack." },
  "Beast of the Sky": { owner: "Primal Companion", kind: "summon", econ: "bonus", ability: "WIS", attacksByLevel: { 3: 1, 11: 2 },
    summon: { name: "Beast of the Sky", econ: "bonus", atk: "SPELL", dmg: [{ dice: "1d4+3+MOD_WIS", type: "slashing" }], ac: "13+MOD_WIS", hp: "4+CLASS_LEVEL*4" },
    notes: "Small, Speed 10 ft and Fly 60 ft; no Opportunity Attacks when it flies out of reach (zones). Beast's Strike: spell attack, 1d4 + 3 + your WIS modifier, Slashing. Hit dice d6 equal to your Ranger level." },
  "Exceptional Training": { owner: "Beast Master", combat: "todo",
    notes: "When you command the beast with a Bonus Action it can also Dash, Disengage, Dodge or Help with its own Bonus Action (Help would give an ally Advantage), and its damaging hits may deal Force instead of the normal type. Needs a second beast action per command." },
  "Bestial Fury": { owner: "Beast Master", combat: "todo",
    notes: "The beast uses Beast's Strike twice when you command it (that count is already in attacksByLevel on the three beasts). Still needed: the first time each turn it hits a creature under your Hunter's Mark it deals extra Force damage equal to that spell's bonus damage." },
  "Share Spells": { owner: "Beast Master", combat: "none",
    notes: "A spell you cast on yourself also affects the beast if it is within 30 ft. Needs summons to take spell effects; not modelled." },

  /* ---- Fey Wanderer */
  "Dreadful Strikes": { owner: "Fey Wanderer", kind: "passive",
    mods: { dmgDie: { dice: "1d4", type: "psychic", on: "weapon", once: "turn" } },
    notes: "A weapon hit deals 1d4 extra Psychic damage; a creature can take it only once per turn (modelled as once per turn in total). 1d6 from Ranger 11 is the |Level 11 variant." },
  "Dreadful Strikes|Fey Wanderer|Level 11": { owner: "Fey Wanderer", minLevel: 11, kind: "passive",
    mods: { dmgDie: { dice: "1d6", type: "psychic", on: "weapon", once: "turn" } }, replaces: "Dreadful Strikes",
    notes: "The extra damage is 1d6 from Ranger level 11." },
  "Otherworldly Glamour": { owner: "Fey Wanderer", combat: "social",
    notes: "WIS modifier (min +1) on Charisma checks, and proficiency in Deception, Performance or Persuasion." },
  "Beguiling Twist": { owner: "Fey Wanderer", kind: "passive", mods: { condAdv: ["charmed", "frightened"] },
    notes: "Modelled: Advantage on saves to avoid or end Charmed or Frightened. Not modelled: when you or a creature you can see within 120 ft succeeds on such a save, a Reaction forces a different creature you can see within 120 ft to make a WIS save or be Charmed or Frightened (your choice) for 1 minute, repeating the save each turn. No trigger exists for 'a creature succeeded on a save'." },
  "Fey Reinforcements": { owner: "Fey Wanderer", kind: "free-cast", spell: "Summon Fey", econ: "action", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Summon Fey once per Long Rest without a slot and without a Material component. You can choose to drop Concentration; the duration is then 1 minute." },
  "Misty Wanderer": { owner: "Fey Wanderer", kind: "free-cast", spell: "Misty Step", econ: "bonus", uses: "Misty Wanderer",
    notes: "Misty Step without a slot, WIS modifier (min 1) times per Long Rest. Every Misty Step can bring one willing creature within 5 ft (zones)." },

  /* ---- Gloom Stalker */
  "Dread Ambusher": { owner: "Gloom Stalker", kind: "on-hit", uses: "Dreadful Strike", dmg: [{ dice: "2d6", type: "psychic" }], once: "turn",
    notes: "Dreadful Strike: after a weapon hit, 2d6 Psychic, once per turn, WIS modifier (min 1) times per Long Rest. The WIS bonus to Initiative is applied by the sheet. +10 ft Speed on your first turn of combat is positioning only." },
  "Umbral Sight": { owner: "Gloom Stalker", combat: "zones",
    notes: "Darkvision 60 ft (applied by the sheet). While entirely in Darkness you are Invisible to creatures that rely on Darkvision; needs per-zone lighting." },
  "Iron Mind": { owner: "Gloom Stalker", combat: "none",
    notes: "WIS save proficiency is applied by SAVE_PROF_FEATURES (INT or CHA instead if already proficient in WIS: not representable there)." },
  "Stalker's Flurry": { owner: "Gloom Stalker", kind: "on-hit", uses: "Dreadful Strike", dmg: [{ dice: "2d8", type: "psychic" }], once: "turn", replaces: "Dread Ambusher",
    notes: "Dreadful Strike deals 2d8. Each use can also add one effect: Sudden Strike (another attack with the same weapon against a different creature within 5 ft of the target and in range; not modelled here) or Mass Fear (the |Mass Fear key)." },
  "Stalker's Flurry|Gloom Stalker|Mass Fear": { owner: "Gloom Stalker", kind: "on-hit", uses: "Dreadful Strike", dmg: [{ dice: "2d8", type: "psychic" }], once: "turn",
    area: { shape: "sphere", size: 10 }, save: "WIS", dc: "SPELL", onFail: [{ cond: "frightened", until: "srcTurnStart" }],
    notes: "Dreadful Strike with Mass Fear: the target and each creature within 10 ft of it make a WIS save or are Frightened until the start of your next turn. The psychic damage hits the target only." },
  "Shadowy Dodge": { owner: "Gloom Stalker", kind: "reaction", trigger: "attacked", econ: "reaction", target: "enemy", mods: { atkDis: true },
    notes: "A creature makes an attack roll against you: Disadvantage on that one roll (no 'until' on purpose). Then, hit or miss, teleport up to 30 ft to an unoccupied space you can see (zones)." },

  /* ---- Hunter */
  "Hunter's Lore": { owner: "Hunter", combat: "none",
    notes: "While a creature is marked by Hunter's Mark you know its Immunities, Resistances and Vulnerabilities (the UI can show them)." },
  "Hunter's Prey": { owner: "Hunter", combat: "none", notes: "Choice only (swappable on a Short or Long Rest); the options are Colossus Slayer and Horde Breaker." },
  "Colossus Slayer": { owner: "Hunter's Prey", kind: "passive",
    mods: { dmgDie: { dice: "1d8", type: "weapon", on: "weapon", once: "turn" } },
    notes: "A weapon hit deals an extra 1d8 (the weapon's damage type) once per turn if the target is missing any of its hit points. The condition is not in the vocabulary; the engine should check the target's HP against its maximum." },
  "Horde Breaker": { owner: "Hunter's Prey", kind: "extra-attacks", econ: "free", n: 1, once: "turn", weapon: "same",
    notes: "Once per turn when you attack with a weapon: another attack with the same weapon against a different creature within 5 ft of the original target, in the weapon's range, that you haven't attacked this turn. Needs a second enemy near the first." },
  "Defensive Tactics": { owner: "Hunter", combat: "none", notes: "Choice only (swappable on a Short or Long Rest); the options are Escape the Horde and Multiattack Defense." },
  "Escape the Horde": { owner: "Defensive Tactics", combat: "zones",
    notes: "Opportunity Attacks against you have Disadvantage; opportunity attacks come with zone movement." },
  "Multiattack Defense": { owner: "Defensive Tactics", kind: "debuff", econ: "none", trigger: "hit", target: "enemy", mods: { atkDis: true }, until: "turnEnd",
    notes: "When a creature hits you with an attack roll, its other attack rolls against you have Disadvantage for the rest of the turn. Only attacks against you; the engine should apply the mod to that creature's later attacks that turn." },
  "Superior Hunter's Prey": { owner: "Hunter", combat: "todo",
    notes: "Once per turn when you damage a creature marked by Hunter's Mark, a different creature you can see within 30 ft of it also takes the spell's extra damage. Needs the mark's damage to hit a second creature." },
  "Superior Hunter's Defense": { owner: "Hunter", kind: "reaction", trigger: "damaged", econ: "reaction", target: "self", effect: { halve: true }, until: "turnEnd",
    notes: "When you take damage: Resistance to that damage type until the end of the current turn, which includes this damage and any more of the same type. Modelled as halving; the engine should keep the resisted type for the rest of the turn." }
});
// data/fx/actions_martial.js
// ACTION_FX, RESOURCE_POOLS and RESOURCE_REST for the martial classes: Barbarian, Fighter, Monk and Rogue.
// Contract: docs/Combat_Schema.md sections B and C. Replaces the Barbarian, Fighter, Monk and Rogue entries of
// data/data_class_actions.js (old contract: docs/Trial_Schema.md).
//
// SCOPE
//   Every class feature and every subclass feature of Barbarian, Fighter, Monk and Rogue in data_classes_*.js, plus
//   every option of Combat Superiority (20 maneuvers), Rage of the Wilds (3), Aspect of the Wilds (3), Power of the
//   Wilds (3), Cunning Strike (6) and Open Hand Technique (3). Each name has an entry: an effect, or
//   combat "none" / "exploration" / "social" / "zones" / "todo".
//
// SOURCES (2024 rules only; every number below was checked against at least two of these)
//   dnd2024.wikidot.com class and subclass pages (2024 Player's Handbook text), SRD 5.2.1 through the open5e v2 API
//   (document__key=srd-2024: Barbarian, Fighter, Monk, Rogue, Berserker, Champion, Open Hand, Thief), and the
//   5etools XPHB data files (class-*.json, optionalfeatures.json) for the non-SRD subclasses and the maneuvers.
//
// RULES THE ENGINE ALREADY APPLIES (no entry here)
//   Extra Attack, Two Extra Attacks, Three Extra Attacks, Sneak Attack dice, Martial Arts, Fighting Style (and the
//   gear engine's styles), Weapon Mastery, Subclass Feature, Ability Score Improvement, Epic Boon, Spellcasting
//   (Eldritch Knight and Arcane Trickster), Divine Fury (Zealot).
//   Also applied elsewhere, so their entries say combat "none": Unarmored Defense, Unarmored Movement and Fast
//   Movement (gear engine: AC and Speed), Primal Champion and Body and Mind (CAPSTONE_BOOSTS), Slippery Mind and
//   Disciplined Survivor's save proficiencies (SAVE_PROF_FEATURES).
//
// KEY CONVENTIONS (the contract has no home for these; the engine needs to read them)
//   1. Keys. A plain name where it is unique. "Name|Owner" where another class shares the name: Choose a Subclass,
//      Evasion, Unarmored Defense, Expertise, Poison. "Feature|Action" where the data bundles several separate
//      actions into one feature and names only the bundle: Monk's Focus (Flurry of Blows, Patient Defense, Step of
//      the Wind), Psionic Power (Psi Warrior and Soulknife), Telekinetic Adept, Soul Blades, Psychic Blades.
//      The validator checks the part before "|", so these pass. Every entry carries its own owner and minLevel, so
//      the engine can list every entry whose owner the character has and whose minLevel is reached, whatever the key.
//   2. Selector features (Rage of the Wilds, Aspect of the Wilds, Power of the Wilds, Cunning Strike, Open Hand
//      Technique, Combat Superiority) have a parent entry with combat "none"; the effects are on the option entries,
//      whose owner is the option feature's key.
//   3. combat "zones" marks movement and positioning that does nothing until Phase 2 (the validator accepts it and
//      section D already uses it). combat "todo" means the engine needs more than the contract can say; notes say what.
//      Zone data (Combat_Schema F.2): four of the 25 combat "zones" entries now express their movement as kind "move" and are
//      listed in a fight: Soul Blades|Psychic Teleportation (teleport 40, costs a Psionic Energy Die), Travel Along the Tree
//      (teleport 60, "Only while Rage is on"), Shadow Step (teleport 60, light gate and Advantage left in notes) and Telekinetic
//      Adept|Psi-Powered Leap (fly 60). The other 21 stay "zones" because they are a rider on another feature (Instinctive
//      Pounce, Tactical Shift, Arcane Charge, Withdraw, Fleet Step, Addle, Lunging Attack, Bait and Switch, Versatile Trickster,
//      Infiltration Expertise, Supreme Sneak, Improved Shadow Step, Cloak of Shadows), a Dash that the engine already does with
//      the character's real Speed (Cunning Action, Step of the Wind, Eagle), another creature's movement (Telekinetic Movement),
//      or a flight or swim Speed that lasts past one turn (Panther, Salmon, Falcon, Stride of the Elements).
//   4. Gates the contract cannot express are the first words of notes: "Only while Rage is on.", "Only while Elemental
//      Attunement is on.", "Needs Reckless Attack.", "Only on a hit that deals Sneak Attack damage." and so on. The
//      engine must check them; without a check the effect would apply too widely.
//   5. once: "turn" (at most once per turn) and once: "rage" (at most once per Rage, Fanatical Focus) on an entry.
//   6. kind "recover" names the resource it refills in pool (Persistent Rage: "Rage"; Uncanny Metabolism and Perfect
//      Focus: "Monk's Focus"); the amount is in notes when it is not "all".
//   7. weapon: "melee" means one weapon or Unarmed Strike attack with the character's best melee profile; "unarmed"
//      means an Unarmed Strike; "psychic blade" is the Soulknife's blade (Finesse, Thrown 60/120, Vex mastery).
//   8. ability: "STR|DEX" with the MOD token means the higher of the two (same idea as CLASS_DC:STR|DEX). Used by Parry.
//   9. Where an onHit list holds alternatives (Brutal Strike, Improved Brutal Strike, Telekinetic Thrust, Elemental
//      Attunement) each rider's note starts with the option name; the player picks one (two different ones for
//      Improved Brutal Strike at Barbarian 17). Everywhere else a list applies all of its riders.
//  10. cost.pool "Sneak Attack Dice" (RESOURCE_POOLS below) is a marker, not a rest-based pool: the Cunning Strike
//      options remove n dice from the Sneak Attack damage of the hit before it is rolled, and add no damage.
//  11. PSI_DIE: the contract has no token for the Psionic Energy Die (d6 at level 3, d8 at 5, d10 at 11, d12 at 17,
//      the same by-level table as the Martial Arts die). Psi Warrior and Soulknife entries use "1d6" and say
//      "PSI_DIE" in notes so the sizes can be fixed by search once the token exists.
//  12. Advantage that the rules give to one attack roll only (Steady Aim, Feinting Attack, Studied Attacks) is stored with
//      a turn-based until (turnEnd, srcTurnEnd) so it always expires; the engine should also end it after that one roll.
//      until: "nextHit" is used on a self buff only by Psychic Veil, meaning "until you next deal damage".
//  13. Effects that help only others, or hinder only attacks against others (Sundering Blow, Distracting Strike, Goading
//      Attack, Wolf, Lion), are text notes or "todo", not modifiers: a real modifier would also help or hinder the
//      character in a one-on-one fight.
//  14. A feature that bundles several actions has child entries only ("Feature|Action"), no parent entry; a selector
//      feature that picks among options (convention 2) has a parent with combat "none".
//
// SIMPLIFICATIONS (everything the entries do not model)
//   - Rage lasts the whole fight. The need to attack, force a save or spend a Bonus Action each round is not tracked,
//     and Incapacitated, Unconscious and Heavy armor do not end it.
//   - Reckless Attack's atkAdv applies to all attack rolls here; the rule limits it to attacks that use Strength.
//   - Staggering Blow's "Disadvantage on the next save" lasts until the start of the Barbarian's next turn (the rule has
//     no time limit, only "the next save"). The "no Opportunity Attacks" effects (Staggering Blow, Addle) wait for
//     zones; there is no modifier key for them.
//   - Daze is modelled as no Bonus Action on the target's next turn (rule: only one of move, action, Bonus Action).
//   - Knock Out ends on the next hit (rule: any damage) and has no 1-minute cap.
//   - Rally leaves out "plus half your Fighter level" (no token for half a level). Psi Warrior and Soulknife dice
//     are all d6 (convention 11). Every combat "todo" entry says in its notes what the engine needs.
//   - Relentless Rage's DC escalation (+5 per use, reset on a rest) and Fanatical Focus's once-per-Rage limit are in
//     notes and once, not as data the engine can count.
//   - Alternate restore costs (expend a Rage use, a Superiority Die or Psionic Energy Dice to refresh a once-per-rest
//     feature) are in notes only.
//   - The Open Hand Technique save DC is the Monk's Focus DC (8 + WIS + PB); the book does not print a DC for it.
//
// CORRECTIONS TO THE OLD data_class_actions.js ENTRIES
//   Cunning Action no longer grants Dodge (it is Dash, Disengage or Hide). Relentless Rage now has its Constitution
//   save (DC 10, +5 per use). Indomitable adds the Fighter level. Stunning Strike has its success effects (Speed
//   halved, next attack has Advantage), once per turn. Assassinate adds Advantage on Initiative (the Rogue-level extra
//   damage is in its notes, not data). Uncanny Metabolism refills Focus Points and is once per Long Rest, not once per
//   fight. Rage now gives Advantage on Strength checks and saves.
//
// WHAT THE ENGINE'S fx KEYS ARE ASSUMED TO MEAN
//   fx.survivor covers both halves of Champion's Survivor (Defy Death and Heroic Rally). fx.remarkableAthlete is the
//   2024 feature (Advantage on Initiative and Athletics checks), not the 2014 half-proficiency. fx.critRange is for
//   weapon attacks and Unarmed Strikes. fx.evasion is Dexterity saves only. effect.bonus on its own (Precision Attack,
//   Homing Strikes) is a bonus added to the roll that just missed.

window.ACTION_FX = Object.assign(window.ACTION_FX || {}, {

  // ==================================================================== BARBARIAN (class)
  "Rage": { owner: "Barbarian", kind: "toggle", econ: "bonus", uses: "Rage", until: "rounds:100",
    mods: { resist: ["bludgeoning", "piercing", "slashing"], dmgFlat: { n: "RAGE", on: "str" }, saveAdv: ["STR"], checkAdv: ["STR"] },
    notes: "Not usable in Heavy armor. No spells or Concentration while raging. Phase 1 keeps the Rage on for the whole fight (see the header)." },
  "Unarmored Defense|Barbarian": { owner: "Barbarian", combat: "none",
    notes: "10 + DEX + CON while unarmored (a Shield is fine). Applied by the gear engine." },
  "Danger Sense": { owner: "Barbarian", minLevel: 2, kind: "passive", fx: { saveAdv: ["DEX"] },
    notes: "Not while Incapacitated." },
  "Reckless Attack": { owner: "Barbarian", minLevel: 2, kind: "stance", econ: "free", until: "srcTurnStart",
    mods: { atkAdv: true, attackersAdv: true },
    notes: "Declared with your first attack roll on your turn. The Advantage is for attack rolls that use Strength only; the contract cannot limit atkAdv, so the engine must. Attack rolls against you have Advantage until the start of your next turn." },
  "Choose a Subclass|Barbarian": { owner: "Barbarian", minLevel: 3, combat: "none" },
  "Primal Knowledge": { owner: "Barbarian", minLevel: 3, combat: "exploration",
    notes: "While raging you may make Acrobatics, Intimidation, Perception, Stealth and Survival checks as Strength checks, which Rage gives Advantage on." },
  "Fast Movement": { owner: "Barbarian", minLevel: 5, combat: "none",
    notes: "+10 ft Speed without Heavy armor. Applied by the gear engine." },
  "Feral Instinct": { owner: "Barbarian", minLevel: 7, kind: "passive", fx: { initAdv: true } },
  "Instinctive Pounce": { owner: "Barbarian", minLevel: 7, combat: "zones",
    notes: "Move up to half your Speed as part of the Bonus Action that starts your Rage." },
  "Brutal Strike": { owner: "Barbarian", minLevel: 9, kind: "on-hit", trigger: "youHit", once: "turn",
    dmg: [{ dice: "1d10", type: "weapon" }], diceByLevel: { 9: 1, 17: 2 },
    onHit: [
      { push: 15, note: "Forceful Blow: push the target 15 ft straight away, then move up to half your Speed straight toward it without Opportunity Attacks." },
      { mod: { speed: -15 }, until: "srcTurnStart", note: "Hamstring Blow: its Speed drops by 15 ft until the start of your next turn; only the most recent Hamstring Blow counts." }
    ],
    notes: "Needs Reckless Attack. Declare it before the roll: give up Advantage on one Strength attack roll that has no Disadvantage. If it hits, add the extra damage (same type as the weapon or Unarmed Strike) and pick one effect from onHit." },
  "Relentless Rage": { owner: "Barbarian", minLevel: 11, kind: "reaction", trigger: "zero", econ: "none",
    save: "CON", dc: 10, effect: { survive: true, hpOnSurvive: "CLASS_LEVEL*2" },
    notes: "Only while Rage is on, and not for instant death. On a success you stay up with HP equal to twice your Barbarian level. The DC rises by 5 each use after the first and resets to 10 on a Short or Long Rest; the engine must count that." },
  "Improved Brutal Strike": { owner: "Barbarian", minLevel: 13, kind: "on-hit", trigger: "youHit", once: "turn", replaces: "Brutal Strike",
    dmg: [{ dice: "1d10", type: "weapon" }], diceByLevel: { 9: 1, 17: 2 },
    onHit: [
      { push: 15, note: "Forceful Blow: push the target 15 ft straight away, then move up to half your Speed straight toward it without Opportunity Attacks." },
      { mod: { speed: -15 }, until: "srcTurnStart", note: "Hamstring Blow: its Speed drops by 15 ft until the start of your next turn; only the most recent Hamstring Blow counts." },
      { mod: { saveDis: "all" }, until: "srcTurnStart", note: "Staggering Blow: Disadvantage on the next saving throw it makes (the engine should end it at that save), and it cannot make Opportunity Attacks until the start of your next turn." },
      { until: "srcTurnStart", note: "Sundering Blow: before the start of your next turn, the next attack roll by another creature against the target gets +5 (it never stacks). A text note, because it helps others only; it does nothing in a one-on-one fight." }
    ],
    notes: "Supersedes Brutal Strike (level 13 adds Staggering and Sundering). At level 17 the damage is 2d10 (diceByLevel) and you pick two different effects per use; the contract has no field for the number of effects." },
  "Persistent Rage": { owner: "Barbarian", minLevel: 15, kind: "recover", econ: "free", pool: "Rage", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Use when you roll Initiative: regain all expended Rage uses. Also, the Rage lasts the full 10 minutes without extending and ends early only if you fall Unconscious or put on Heavy armor." },
  "Indomitable Might": { owner: "Barbarian", minLevel: 18, combat: "todo",
    notes: "A Strength check or Strength saving throw total below your Strength score becomes the score. Needs a minimum-total rule for STR checks and saves (an fx key such as strFloor); no key exists." },
  "Primal Champion": { owner: "Barbarian", minLevel: 20, combat: "none",
    notes: "Strength and Constitution +4, maximum 25. Applied by the rules engine (CAPSTONE_BOOSTS)." },

  // ==================================================================== BARBARIAN (Path of the Berserker)
  "Frenzy": { owner: "Path of the Berserker", minLevel: 3, kind: "passive",
    mods: { dmgDie: { dice: "RAGEd6", type: "weapon", on: "str", once: "turn" } },
    notes: "Only while Rage is on and you used Reckless Attack this turn. The first target you hit on your turn with a Strength attack takes RAGE d6s extra damage (2d6, 3d6 at level 9, 4d6 at 16), the type of the weapon or Unarmed Strike. RAGEd6 is the RAGE token followed by d6." },
  "Mindless Rage": { owner: "Path of the Berserker", minLevel: 6, kind: "passive", fx: { condImmune: ["charmed", "frightened"] },
    notes: "Only while Rage is on. If you are Charmed or Frightened when you enter a Rage, both end." },
  "Retaliation": { owner: "Path of the Berserker", minLevel: 10, kind: "reaction", trigger: "damaged", econ: "reaction", target: "enemy", weapon: "melee",
    notes: "When a creature within 5 ft damages you, make one melee attack against it with a weapon or an Unarmed Strike." },
  "Intimidating Presence": { owner: "Path of the Berserker", minLevel: 14, kind: "save-effect", econ: "bonus", target: "area",
    area: { shape: "emanation", size: 30 }, save: "WIS", dc: "CLASS_DC:STR",
    onFail: [{ cond: "frightened", until: "rounds:10", repeat: "end" }],
    usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Creatures of your choice in the 30-ft Emanation. The frightened creature repeats the save at the end of each of its turns. Expending a Rage use (no action) restores the use; the contract cannot say that." },

  // ==================================================================== BARBARIAN (Path of the Wild Heart)
  "Animal Speaker": { owner: "Path of the Wild Heart", minLevel: 3, combat: "exploration",
    notes: "Beast Sense and Speak with Animals as Rituals, using Wisdom." },
  "Rage of the Wilds": { owner: "Path of the Wild Heart", minLevel: 3, combat: "none",
    notes: "Selector: choose Bear, Eagle or Wolf each time you activate your Rage. The effects are on those three entries." },
  "Aspect of the Wilds": { owner: "Path of the Wild Heart", minLevel: 6, combat: "none",
    notes: "Selector: choose Owl, Panther or Salmon; you can change it after each Long Rest. The effects are on those three entries." },
  "Nature Speaker": { owner: "Path of the Wild Heart", minLevel: 10, combat: "exploration",
    notes: "Commune with Nature as a Ritual, using Wisdom." },
  "Power of the Wilds": { owner: "Path of the Wild Heart", minLevel: 14, combat: "none",
    notes: "Selector: choose Falcon, Lion or Ram each time you activate your Rage. The effects are on those three entries." },

  "Bear": { owner: "Rage of the Wilds", minLevel: 3, kind: "buff", econ: "none", target: "self", until: "rounds:100",
    mods: { resist: ["acid", "bludgeoning", "cold", "fire", "lightning", "piercing", "poison", "slashing", "thunder"] },
    notes: "Chosen when you activate your Rage and lasts as long as it. Resistance to every damage type except force, necrotic, psychic and radiant." },
  "Eagle": { owner: "Rage of the Wilds", minLevel: 3, combat: "zones",
    notes: "Take Disengage and Dash as part of the Bonus Action that starts your Rage, and again as a Bonus Action each turn while it lasts. Movement only." },
  "Wolf": { owner: "Rage of the Wilds", minLevel: 3, combat: "todo",
    notes: "Only while Rage is on. Your allies have Advantage on attack rolls against any enemy of yours within 5 ft of you. Needs an allies-only attackersAdv source around the Barbarian; no effect in a one-on-one fight." },
  "Owl": { owner: "Aspect of the Wilds", minLevel: 6, combat: "exploration",
    notes: "Darkvision 60 ft, or +60 ft to Darkvision you have. Matters in combat only once Phase 2 adds lighting." },
  "Panther": { owner: "Aspect of the Wilds", minLevel: 6, combat: "zones",
    notes: "Climb Speed equal to your Speed." },
  "Salmon": { owner: "Aspect of the Wilds", minLevel: 6, combat: "zones",
    notes: "Swim Speed equal to your Speed." },
  "Falcon": { owner: "Power of the Wilds", minLevel: 14, combat: "zones",
    notes: "Only while Rage is on and you wear no armor: Fly Speed equal to your Speed." },
  "Lion": { owner: "Power of the Wilds", minLevel: 14, combat: "todo",
    notes: "Only while Rage is on. Enemies within 5 ft of you have Disadvantage on attack rolls against targets other than you or another Barbarian with this option. Needs a disadvantage-against-others modifier; no effect in a one-on-one fight." },
  "Ram": { owner: "Power of the Wilds", minLevel: 14, kind: "on-hit", trigger: "youHit",
    onHit: [{ cond: "prone", sizeMax: "Large" }],
    notes: "Only while Rage is on, and only on melee hits. No save, no cost and no limit per turn: a hit can knock a Large or smaller creature Prone." },

  // ==================================================================== BARBARIAN (Path of the World Tree)
  "Vitality of the Tree": { owner: "Path of the World Tree", minLevel: 3, kind: "temphp", econ: "none", target: "self", temp: "CLASS_LEVEL",
    notes: "Granted each time you activate your Rage (the engine needs a Rage-activation hook). Life-Giving Force also gives another creature within 10 ft RAGEd6 Temporary HP at the start of each of your turns while raging; those vanish when the Rage ends. Allies only, so Phase 2." },
  "Branches of the Tree": { owner: "Path of the World Tree", minLevel: 6, kind: "reaction", trigger: "turnStart", econ: "reaction", target: "enemy",
    save: "STR", dc: "CLASS_DC:STR",
    onFail: [{ teleport: 5 }, { mod: { speedMult: 0 }, until: "turnEnd" }],
    notes: "Only while Rage is on. A creature you can see within 30 ft starts its turn. On a failed save it is teleported to an open space within 5 ft of you, and you can set its Speed to 0 until the end of that turn. The move waits for zones." },
  "Battering Roots": { owner: "Path of the World Tree", minLevel: 10, combat: "todo",
    notes: "Your Heavy and Versatile melee weapons get +10 ft reach on your turn (zones), and a hit with one lets you apply Push or Topple mastery in addition to the weapon's own mastery. Needs the mastery engine to allow a second mastery property on one hit." },
  "Travel Along the Tree": { owner: "Path of the World Tree", minLevel: 14, kind: "move", econ: "bonus", move: { teleport: 60 },
    notes: "Only while Rage is on. Teleport up to 60 ft as a Bonus Action. Not modelled: the free teleport when you activate your Rage, and the once-per-Rage 150 ft version that brings up to six willing creatures within 10 ft." },

  // ==================================================================== BARBARIAN (Path of the Zealot)
  "Warrior of the Gods": { owner: "Path of the Zealot", minLevel: 3, kind: "heal", econ: "bonus", target: "self",
    cost: { pool: "Warrior of the Gods", n: 1 }, heal: "1d12",
    notes: "Spend any number of d12s from the pool: each die spent (n is per die) heals 1d12. The pool is 4 dice, 5 at level 6, 6 at 12, 7 at 17, and refills on a Long Rest." },
  "Fanatical Focus": { owner: "Path of the Zealot", minLevel: 6, kind: "reaction", trigger: "failedSave", econ: "none", once: "rage",
    effect: { reroll: true, bonus: "RAGE" },
    notes: "Only while Rage is on. Once per active Rage, reroll a failed saving throw with a bonus equal to your Rage Damage bonus; you must use the new roll. The engine resets the limit each time Rage is activated." },
  "Zealous Presence": { owner: "Path of the Zealot", minLevel: 10, kind: "buff", econ: "bonus", target: "allies", n: 10,
    mods: { atkAdv: true, saveAdv: "all" }, until: "srcTurnStart",
    usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Up to ten other creatures within 60 ft. Allies only, so it does nothing in a one-on-one fight. Expending a Rage use (no action) restores the use; the contract cannot say that." },
  "Rage of the Gods": { owner: "Path of the Zealot", minLevel: 14, kind: "buff", econ: "free", target: "self", until: "rounds:10",
    usesFlat: 1, rest: { short: "none", long: "all" },
    mods: { resist: ["necrotic", "psychic", "radiant"] },
    notes: "Use when you activate your Rage. The form lasts 1 minute or until you drop to 0 HP. It also gives a Fly Speed equal to your Speed with hover (zones), and a Reaction to expend a Rage use when another creature within 30 ft would drop to 0 HP so it stays at HP equal to your Barbarian level (allies only, Phase 2)." },

  // ==================================================================== FIGHTER (class)
  "Second Wind": { owner: "Fighter", kind: "heal", econ: "bonus", uses: "Second Wind", target: "self", heal: "1d10+CLASS_LEVEL",
    notes: "Tactical Shift (level 5) lets you move up to half your Speed without Opportunity Attacks as part of it (zones)." },
  "Action Surge": { owner: "Fighter", minLevel: 2, kind: "extra-action", econ: "free", uses: "Action Surge",
    notes: "One extra action on your turn, but not the Magic action. At level 17 you have two uses but still only one per turn." },
  "Tactical Mind": { owner: "Fighter", minLevel: 2, combat: "exploration",
    notes: "After failing an ability check, expend a Second Wind use to add 1d10; the use is kept if the check still fails." },
  "Choose a Subclass|Fighter": { owner: "Fighter", minLevel: 3, combat: "none" },
  "Tactical Shift": { owner: "Fighter", minLevel: 5, combat: "zones",
    notes: "Move up to half your Speed without Opportunity Attacks when you use Second Wind." },
  "Indomitable": { owner: "Fighter", minLevel: 9, kind: "reaction", trigger: "failedSave", econ: "none", uses: "Indomitable",
    effect: { reroll: true, bonus: "CLASS_LEVEL" },
    notes: "Reroll a failed save with a bonus equal to your Fighter level; you must use the new roll. One use per Long Rest, two at level 13, three at 17." },
  "Tactical Master": { owner: "Fighter", minLevel: 9, combat: "todo",
    notes: "When you attack with a weapon whose mastery you can use, you may swap that property for Push, Sap or Slow for that attack. Needs the mastery engine to accept a swap." },
  "Indomitable (Two Uses)": { owner: "Fighter", minLevel: 13, combat: "none",
    notes: "Raises Indomitable to two uses; counted by RESOURCE_POOLS Indomitable (byLevel)." },
  "Studied Attacks": { owner: "Fighter", minLevel: 13, kind: "passive", trigger: "youMiss",
    mods: { atkAdv: true }, until: "srcTurnEnd",
    notes: "After you miss a creature, you have Advantage on your next attack roll against that same creature before the end of your next turn. Only that creature and only the next attack roll; the engine should limit it." },
  "Action Surge (Two Uses)": { owner: "Fighter", minLevel: 17, combat: "none",
    notes: "Raises Action Surge to two uses (RESOURCE_USES byLevel); still once per turn." },
  "Indomitable (Three Uses)": { owner: "Fighter", minLevel: 17, combat: "none",
    notes: "Raises Indomitable to three uses; counted by RESOURCE_POOLS Indomitable (byLevel)." },

  // ==================================================================== FIGHTER (Battle Master)
  "Combat Superiority": { owner: "Battle Master", minLevel: 3, combat: "none",
    notes: "Selector: the maneuvers are the 20 option entries (owner \"Combat Superiority\"), paid with the Superiority Dice pool. Save DC is 8 + PB + your STR or DEX modifier, whichever is higher. You use one maneuver per attack." },
  "Student of War": { owner: "Battle Master", minLevel: 3, combat: "none",
    notes: "One Artisan's Tools proficiency and one Fighter skill." },
  "Know Your Enemy": { owner: "Battle Master", minLevel: 7, kind: "special", econ: "bonus", target: "enemy",
    usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Learn the Immunities, Resistances and Vulnerabilities of a creature you can see within 30 ft. Expending one Superiority Die (no action) restores the use; the contract cannot say that." },
  "Improved Combat Superiority": { owner: "Battle Master", minLevel: 10, combat: "none",
    notes: "Superiority Dice become d10s; the SUP_DIE token and the Superiority Dice pool carry this." },
  "Relentless": { owner: "Battle Master", minLevel: 15, combat: "todo",
    notes: "Once per turn, when you use a maneuver, roll 1d8 and use it in place of expending a Superiority Die. Needs a free-maneuver-once-per-turn rule in the maneuver spend." },
  "Ultimate Combat Superiority": { owner: "Battle Master", minLevel: 18, combat: "none",
    notes: "Superiority Dice become d12s; the SUP_DIE token and the Superiority Dice pool carry this." },

  // ==================================================================== FIGHTER (Champion)
  "Improved Critical": { owner: "Champion", minLevel: 3, kind: "passive", fx: { critRange: 19 },
    notes: "Weapon attacks and Unarmed Strikes only, not spell attack rolls." },
  "Remarkable Athlete": { owner: "Champion", minLevel: 3, kind: "passive", fx: { remarkableAthlete: true, initAdv: true },
    notes: "Advantage on Initiative and Strength (Athletics) checks. After a Critical Hit you may move up to half your Speed without Opportunity Attacks (zones)." },
  "Additional Fighting Style": { owner: "Champion", minLevel: 7, combat: "none",
    notes: "A second Fighting Style feat; the gear engine handles styles like the first one." },
  "Heroic Warrior": { owner: "Champion", minLevel: 10, kind: "passive", trigger: "turnStart", effect: { heroicInspiration: true },
    notes: "In combat, at the start of each of your turns you gain Heroic Inspiration if you do not have it." },
  "Superior Critical": { owner: "Champion", minLevel: 15, kind: "passive", fx: { critRange: 18 }, replaces: "Improved Critical",
    notes: "Weapon attacks and Unarmed Strikes only, not spell attack rolls." },
  "Survivor": { owner: "Champion", minLevel: 18, kind: "passive", fx: { survivor: true },
    notes: "Defy Death: Advantage on Death Saving Throws, and a roll of 18-20 counts as 20. Heroic Rally: at the start of each of your turns, regain 5 + CON modifier HP while Bloodied with at least 1 HP." },

  // ==================================================================== FIGHTER (Eldritch Knight)
  "War Bond": { owner: "Eldritch Knight", minLevel: 3, combat: "none",
    notes: "A bonded weapon cannot be disarmed unless you are Incapacitated, and can be called to your hand as a Bonus Action." },
  "War Magic": { owner: "Eldritch Knight", minLevel: 7, kind: "special", econ: "attack",
    notes: "When you take the Attack action, replace one attack with casting a Wizard cantrip you know that has a casting time of an action." },
  "Eldritch Strike": { owner: "Eldritch Knight", minLevel: 10, kind: "on-hit", trigger: "youHit",
    onHit: [{ mod: { saveDis: "all" }, until: "srcTurnEnd", note: "Disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn (spell saves only; the engine should end it at that save)." }],
    notes: "On a weapon hit." },
  "Arcane Charge": { owner: "Eldritch Knight", minLevel: 15, combat: "zones",
    notes: "When you use Action Surge, teleport up to 30 ft to an open space you can see, before or after the extra action." },
  "Improved War Magic": { owner: "Eldritch Knight", minLevel: 18, kind: "special", econ: "attack",
    notes: "When you take the Attack action, replace two attacks with casting a level 1 or 2 Wizard spell that has a casting time of an action. War Magic still applies for cantrips." },

  // ==================================================================== FIGHTER (Psi Warrior)
  // Psionic Energy Dice: see RESOURCE_POOLS "Psi Warrior Energy Dice". PSI_DIE: dice shown as 1d6 (see the header).
  "Psionic Power|Protective Field": { owner: "Psi Warrior", minLevel: 3, kind: "reaction", trigger: "damaged", econ: "reaction",
    cost: { pool: "Psi Warrior Energy Dice", n: 1 }, target: "creature", effect: { reduce: "1d6+MOD_INT" },
    notes: "PSI_DIE. You or another creature you can see within 30 ft takes damage: reduce it by the die + your INT modifier, at least 1. The die grows to d8 at level 5, d10 at 11, d12 at 17." },
  "Psionic Power|Psionic Strike": { owner: "Psi Warrior", minLevel: 3, kind: "on-hit", trigger: "youHit", once: "turn",
    cost: { pool: "Psi Warrior Energy Dice", n: 1 }, dmg: [{ dice: "1d6+MOD_INT", type: "force" }],
    notes: "PSI_DIE. Once per turn, right after a weapon attack hits and deals damage to a target within 30 ft. The die grows to d8 at level 5, d10 at 11, d12 at 17." },
  "Psionic Power|Telekinetic Movement": { owner: "Psi Warrior", minLevel: 3, combat: "zones",
    usesFlat: 1, rest: { short: "all", long: "all" },
    notes: "Magic action: move a Large-or-smaller loose object, or one willing creature other than you, up to 30 ft. Free once per Short or Long Rest; expending a Psionic Energy Die (no action) restores the use." },
  "Telekinetic Adept|Psi-Powered Leap": { owner: "Psi Warrior", minLevel: 7, kind: "move", econ: "bonus", move: { fly: 60 },
    usesFlat: 1, rest: { short: "all", long: "all" },
    notes: "Bonus Action: Fly Speed of twice your Speed until the end of the turn; move.fly is 60, twice a Speed of 30, because the contract takes a fixed number. Free once per Short or Long Rest; expending a Psionic Energy Die (no action) restores the use." },
  "Telekinetic Adept|Telekinetic Thrust": { owner: "Psi Warrior", minLevel: 7, kind: "on-hit", trigger: "youHit",
    onHit: [
      { cond: "prone", save: "STR", dc: "CLASS_DC:INT", note: "Prone: if Psionic Strike dealt damage, the target makes a Strength save or falls Prone." },
      { push: 10, save: "STR", dc: "CLASS_DC:INT", note: "Moved: instead of Prone, the target is moved up to 10 ft horizontally." }
    ],
    notes: "Only when Psionic Strike deals damage; pick one of the two outcomes (they are alternatives). DC is 8 + INT modifier + PB." },
  "Guarded Mind": { owner: "Psi Warrior", minLevel: 10, kind: "passive", fx: { resist: ["psychic"] },
    notes: "If you start your turn Charmed or Frightened, expend a Psionic Energy Die (no action) to end every effect on you giving those conditions; the contract cannot express the cleanse." },
  "Bulwark of Force": { owner: "Psi Warrior", minLevel: 15, kind: "buff", econ: "bonus", target: "allies", n: "MOD_INT",
    mods: { ac: 2 }, until: "rounds:10", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Chosen creatures within 30 ft, yourself included, up to your INT modifier (minimum 1; n is a formula), get Half Cover for 1 minute or until you are Incapacitated. Half Cover is also +2 on Dexterity saves; mods.save cannot be limited to DEX, so it is left out. Expending a Psionic Energy Die (no action) restores the use." },
  "Telekinetic Master": { owner: "Psi Warrior", minLevel: 18, kind: "free-cast", spell: "Telekinesis", econ: "action",
    usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Cast without a slot or components, using INT. While you concentrate on it you can make one weapon attack as a Bonus Action each turn. Expending a Psionic Energy Die (no action) restores the use." },

  // ==================================================================== MONK (class)
  "Unarmored Defense|Monk": { owner: "Monk", combat: "none",
    notes: "10 + DEX + WIS with no armor and no Shield. Applied by the gear engine." },
  "Monk's Focus|Flurry of Blows": { owner: "Monk", minLevel: 2, kind: "extra-attacks", econ: "bonus",
    cost: { pool: "Monk's Focus", n: 1 }, weapon: "unarmed", attacksByLevel: { 2: 2, 10: 3 },
    notes: "Two Unarmed Strikes, three from level 10 (Heightened Focus). Warrior of the Open Hand's Open Hand Technique applies to each hit." },
  "Monk's Focus|Patient Defense": { owner: "Monk", minLevel: 2, kind: "dodge", econ: "bonus",
    cost: { pool: "Monk's Focus", n: 1 },
    notes: "1 Focus Point: Disengage and Dodge. Without the point it is only a Bonus Action Disengage (zones)." },
  "Monk's Focus|Step of the Wind": { owner: "Monk", minLevel: 2, combat: "zones",
    notes: "Bonus Action Dash, or 1 Focus Point for Dash plus Disengage and doubled jump distance. Movement only." },
  "Unarmored Movement": { owner: "Monk", minLevel: 2, combat: "none",
    notes: "+10 ft Speed, rising to +30 ft, without armor or a Shield. Applied by the gear engine." },
  "Uncanny Metabolism": { owner: "Monk", minLevel: 2, kind: "recover", econ: "free", uses: "Uncanny Metabolism", pool: "Monk's Focus",
    heal: "CLASS_LEVEL+MARTIAL_DIE",
    notes: "Use when you roll Initiative: regain all expended Focus Points and heal your Monk level + one Martial Arts die roll. Once per Long Rest. The engine needs an Initiative hook." },
  "Deflect Attacks": { owner: "Monk", minLevel: 3, kind: "reaction", trigger: "hit", econ: "reaction",
    effect: { reduce: "1d10+MOD_DEX+CLASS_LEVEL" },
    notes: "Only if the damage includes bludgeoning, piercing or slashing (Deflect Energy lifts this at level 13). If you reduce it to 0, spend 1 Focus Point to redirect it: a creature you can see within 5 ft (melee) or 60 ft, not behind Total Cover (ranged), makes a DEX save (DC 8 + WIS + PB) or takes two Martial Arts die rolls + DEX modifier of the same type. The redirect has its own cost and save, so it is left to the engine." },
  "Choose a Subclass|Monk": { owner: "Monk", minLevel: 3, combat: "none" },
  "Slow Fall": { owner: "Monk", minLevel: 4, combat: "exploration",
    notes: "Reaction when you fall: reduce the damage by 5 times your Monk level." },
  "Stunning Strike": { owner: "Monk", minLevel: 5, kind: "on-hit", trigger: "youHit", once: "turn",
    cost: { pool: "Monk's Focus", n: 1 }, save: "CON", dc: "CLASS_DC:WIS",
    onFail: [{ cond: "stunned", until: "srcTurnStart" }],
    onSuccess: [
      { mod: { speedMult: 0.5 }, until: "srcTurnStart" },
      { mod: { attackersAdv: true }, until: "nextHit", note: "The next attack roll against it before the start of your next turn has Advantage; the engine should end this after that one roll." }
    ],
    notes: "Once per turn, on a hit with a Monk weapon or an Unarmed Strike." },
  "Empowered Strikes": { owner: "Monk", minLevel: 6, combat: "todo",
    notes: "Your Unarmed Strikes can deal Force damage instead of their normal type. Needs a per-attack damage-type choice for Unarmed Strikes (it matters against bludgeoning resistance)." },
  "Evasion|Monk": { owner: "Monk", minLevel: 7, kind: "passive", fx: { evasion: true },
    notes: "Dexterity saves for half damage only; not while Incapacitated." },
  "Acrobatic Movement": { owner: "Monk", minLevel: 9, combat: "exploration",
    notes: "Walk on vertical surfaces and liquids on your turn without falling, while unarmored with no Shield." },
  "Heightened Focus": { owner: "Monk", minLevel: 10, kind: "dodge", econ: "bonus",
    cost: { pool: "Monk's Focus", n: 1 }, temp: "MARTIAL_DIE+MARTIAL_DIE", replaces: "Monk's Focus|Patient Defense",
    notes: "Patient Defense also gives Temporary HP equal to two Martial Arts die rolls. Flurry of Blows makes three strikes (attacksByLevel on that entry), and Step of the Wind can carry a willing Large-or-smaller creature within 5 ft (zones)." },
  "Self-Restoration": { owner: "Monk", minLevel: 10, combat: "todo",
    notes: "At the end of each of your turns, remove Charmed, Frightened or Poisoned from yourself (your choice of one). Needs an end-of-own-turn hook to cleanse a condition." },
  "Deflect Energy": { owner: "Monk", minLevel: 13, kind: "reaction", trigger: "hit", econ: "reaction",
    effect: { reduce: "1d10+MOD_DEX+CLASS_LEVEL" }, replaces: "Deflect Attacks",
    notes: "Deflect Attacks against any damage type, not just bludgeoning, piercing and slashing. The Focus Point redirect is as in Deflect Attacks." },
  "Disciplined Survivor": { owner: "Monk", minLevel: 14, kind: "reaction", trigger: "failedSave", econ: "none",
    cost: { pool: "Monk's Focus", n: 1 }, effect: { reroll: true },
    notes: "Spend 1 Focus Point to reroll a failed save; you must use the new roll. The proficiency in all saves is applied by the rules engine." },
  "Perfect Focus": { owner: "Monk", minLevel: 15, kind: "recover", econ: "none", pool: "Monk's Focus",
    notes: "When you roll Initiative without using Uncanny Metabolism and have 3 or fewer Focus Points, regain points until you have 4. The engine needs an Initiative hook and an amount (set to 4)." },
  "Superior Defense": { owner: "Monk", minLevel: 18, kind: "buff", econ: "free", target: "self", until: "rounds:10",
    cost: { pool: "Monk's Focus", n: 3 },
    mods: { resist: ["acid", "bludgeoning", "cold", "fire", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"] },
    notes: "Use at the start of your turn. Resistance to all damage except force for 1 minute or until you are Incapacitated." },
  "Body and Mind": { owner: "Monk", minLevel: 20, combat: "none",
    notes: "Dexterity and Wisdom +4, maximum 25. Applied by the rules engine (CAPSTONE_BOOSTS)." },

  // ==================================================================== MONK (Warrior of Mercy)
  "Hand of Harm": { owner: "Warrior of Mercy", minLevel: 3, kind: "on-hit", trigger: "youHit", once: "turn",
    cost: { pool: "Monk's Focus", n: 1 }, dmg: [{ dice: "MARTIAL_DIE+MOD_WIS", type: "necrotic" }],
    notes: "Once per turn, when an Unarmed Strike deals damage." },
  "Hand of Healing": { owner: "Warrior of Mercy", minLevel: 3, kind: "heal", econ: "action", target: "creature",
    cost: { pool: "Monk's Focus", n: 1 }, heal: "MARTIAL_DIE+MOD_WIS",
    notes: "Magic action, touch. When you use Flurry of Blows you may replace one strike with a free use of this healing (no Focus Point)." },
  "Implements of Mercy": { owner: "Warrior of Mercy", minLevel: 3, combat: "none",
    notes: "Insight and Medicine proficiency and the Herbalism Kit." },
  "Physician's Touch": { owner: "Warrior of Mercy", minLevel: 6, kind: "on-hit", trigger: "youHit", once: "turn", replaces: "Hand of Harm",
    cost: { pool: "Monk's Focus", n: 1 }, dmg: [{ dice: "MARTIAL_DIE+MOD_WIS", type: "necrotic" }],
    onHit: [{ cond: "poisoned", until: "srcTurnEnd" }],
    notes: "Hand of Harm can also give the target Poisoned until the end of your next turn (no save). Hand of Healing can also end one of Blinded, Deafened, Paralyzed, Poisoned or Stunned on the creature healed; the heal entry has no field for that." },
  "Flurry of Healing and Harm": { owner: "Warrior of Mercy", minLevel: 11, combat: "todo",
    uses: "Flurry of Healing and Harm",
    notes: "WIS-modifier uses (minimum 1) per Long Rest. During Flurry of Blows, replace each strike with a free Hand of Healing, and apply Hand of Harm to a strike that deals damage without spending its Focus Point (still once per turn). Needs free (no Focus Point) variants of Hand of Healing and Hand of Harm and a shared use counter." },
  "Hand of Ultimate Mercy": { owner: "Warrior of Mercy", minLevel: 17, kind: "heal", econ: "action", target: "ally",
    cost: { pool: "Monk's Focus", n: 5 }, usesFlat: 1, rest: { short: "none", long: "all" }, heal: "4d10+MOD_WIS",
    notes: "Magic action: touch a creature that died within the last 24 hours. It returns to life with 4d10 + WIS modifier HP, without Blinded, Deafened, Paralyzed, Poisoned or Stunned. Needs a dead companion to target, so Phase 2." },

  // ==================================================================== MONK (Warrior of Shadow)
  "Shadow Arts": { owner: "Warrior of Shadow", minLevel: 3, kind: "free-cast", spell: "Darkness", econ: "action",
    cost: { pool: "Monk's Focus", n: 1 },
    notes: "Cast Darkness for 1 Focus Point without components, and you can see inside it. While it lasts you can move its area up to 60 ft at the start of each of your turns. Also 60 ft Darkvision (or +60 ft) and the Minor Illusion cantrip with Wisdom." },
  "Shadow Step": { owner: "Warrior of Shadow", minLevel: 6, kind: "move", econ: "bonus", move: { teleport: 60 },
    notes: "Only while entirely in Dim Light or Darkness, and only to a space that is also dim or dark: the engine must check the zone's light. Not modelled: Advantage on the next melee attack you make before the end of the turn." },
  "Improved Shadow Step": { owner: "Warrior of Shadow", minLevel: 11, combat: "zones",
    notes: "Spend 1 Focus Point to ignore the Dim Light or Darkness requirement for one Shadow Step, and make an Unarmed Strike right after teleporting as part of the same Bonus Action." },
  "Cloak of Shadows": { owner: "Warrior of Shadow", minLevel: 17, combat: "zones",
    notes: "Magic action, only while entirely in Dim Light or Darkness, 3 Focus Points: for 1 minute (ends if you are Incapacitated or end a turn in Bright Light) you are Invisible, can move through occupied spaces as Difficult Terrain, and use Flurry of Blows for free. Needs per-zone light." },

  // ==================================================================== MONK (Warrior of the Elements)
  "Elemental Attunement": { owner: "Warrior of the Elements", minLevel: 3, kind: "toggle", econ: "free", until: "rounds:100",
    cost: { pool: "Monk's Focus", n: 1 },
    onHit: [
      { push: 10, save: "STR", dc: "CLASS_DC:WIS", note: "Push: on an Unarmed Strike hit that deals acid, cold, fire, lightning or thunder damage, a failed Strength save moves the target up to 10 ft away from you." },
      { pull: 10, save: "STR", dc: "CLASS_DC:WIS", note: "Pull: alternatively, move the target up to 10 ft toward you." }
    ],
    notes: "Start of your turn, 10 minutes or until Incapacitated. Unarmed Strikes reach 10 ft farther (zones), and each hit can deal acid, cold, fire, lightning or thunder damage instead of its normal type (needs the same per-attack damage-type choice as Empowered Strikes). Push and Pull are alternatives." },
  "Manipulate Elements": { owner: "Warrior of the Elements", minLevel: 3, combat: "none",
    notes: "Grants the Elementalism cantrip, using Wisdom." },
  "Elemental Burst": { owner: "Warrior of the Elements", minLevel: 6, kind: "save-effect", econ: "action", target: "area",
    area: { shape: "sphere", size: 20 }, cost: { pool: "Monk's Focus", n: 2 }, save: "DEX", dc: "CLASS_DC:WIS", half: true,
    dmg: [{ dice: "MARTIAL_DIE+MARTIAL_DIE+MARTIAL_DIE", type: ["acid", "cold", "fire", "lightning", "thunder"] }],
    notes: "Magic action, point within 120 ft. Choose the damage type when you use it." },
  "Stride of the Elements": { owner: "Warrior of the Elements", minLevel: 11, combat: "zones",
    notes: "Only while Elemental Attunement is on: Fly Speed and Swim Speed equal to your Speed." },
  "Elemental Epitome": { owner: "Warrior of the Elements", minLevel: 17, combat: "todo",
    notes: "Only while Elemental Attunement is on. (1) Resistance to one of acid, cold, fire, lightning or thunder, changeable at the start of each turn: needs a per-turn chosen resistance. (2) Once per turn, an Unarmed Strike hit deals one extra Martial Arts die of the same type as that strike: needs an unarmed-only once-per-turn damage rider. (3) Step of the Wind gives +20 ft Speed and one Martial Arts die of damage to each creature you pass within 5 ft (zones)." },

  // ==================================================================== MONK (Warrior of the Open Hand)
  "Open Hand Technique": { owner: "Warrior of the Open Hand", minLevel: 3, combat: "none",
    notes: "Selector: whenever a hit from Flurry of Blows lands, choose Addle, Push or Topple. The effects are on those three entries. Save DC is the Monk's Focus DC, 8 + WIS + PB." },
  "Addle": { owner: "Open Hand Technique", minLevel: 3, combat: "zones",
    notes: "On a Flurry of Blows hit: the target cannot make Opportunity Attacks until the start of its next turn. Needs a no-Opportunity-Attacks modifier; mods.noReactions would also stop its other reactions, so it is not used." },
  "Push": { owner: "Open Hand Technique", minLevel: 3, kind: "on-hit", trigger: "youHit",
    onHit: [{ push: 15, save: "STR", dc: "CLASS_DC:WIS" }],
    notes: "On a Flurry of Blows hit: a failed Strength save pushes the target up to 15 ft away from you." },
  "Topple": { owner: "Open Hand Technique", minLevel: 3, kind: "on-hit", trigger: "youHit",
    onHit: [{ cond: "prone", save: "DEX", dc: "CLASS_DC:WIS" }],
    notes: "On a Flurry of Blows hit: a failed Dexterity save leaves the target Prone." },
  "Wholeness of Body": { owner: "Warrior of the Open Hand", minLevel: 6, kind: "heal", econ: "bonus", uses: "Wholeness of Body", target: "self",
    heal: "MARTIAL_DIE+MOD_WIS",
    notes: "Regain at least 1 HP. Uses equal your WIS modifier (minimum 1) per Long Rest." },
  "Fleet Step": { owner: "Warrior of the Open Hand", minLevel: 11, combat: "zones",
    notes: "When you take a Bonus Action other than Step of the Wind, you can use Step of the Wind right after it." },
  "Quivering Palm": { owner: "Warrior of the Open Hand", minLevel: 17, combat: "todo",
    cost: { pool: "Monk's Focus", n: 4 }, save: "CON", dc: "CLASS_DC:WIS", half: true, dmg: [{ dice: "10d12", type: "force" }],
    notes: "Two stages. (1) On an Unarmed Strike hit, spend 4 Focus Points to start harmless vibrations that last Monk-level days, on one creature at a time. (2) Later, when you take the Attack action you may give up one attack (or use an action) to end them: the target makes a Constitution save, taking 10d12 force damage, half on a success. You can end them harmlessly with no action. Needs a pending-effect state on a target and a way to spend an attack on it." },

  // ==================================================================== ROGUE (class)
  "Expertise|Rogue": { owner: "Rogue", combat: "exploration",
    notes: "Expertise in two skills at level 1 and two more at level 6. Applied by the sheet." },
  "Thieves' Cant": { owner: "Rogue", combat: "social" },
  "Cunning Action": { owner: "Rogue", minLevel: 2, combat: "zones",
    notes: "Dash, Disengage or Hide as a Bonus Action. Dash and Disengage are movement. Hide needs obscurement or cover (DC 15 Stealth) and gives the Invisible condition. It does not grant Dodge (the old entry wrongly did)." },
  "Choose a Subclass|Rogue": { owner: "Rogue", minLevel: 3, combat: "none" },
  "Steady Aim": { owner: "Rogue", minLevel: 3, kind: "stance", econ: "bonus", mods: { atkAdv: true }, until: "turnEnd",
    notes: "Only if you have not moved this turn. Advantage on your next attack roll this turn (the engine should end it after that roll). Your Speed is 0 for the rest of the turn; Assassin's Roving Aim removes that." },
  "Cunning Strike": { owner: "Rogue", minLevel: 5, combat: "none",
    notes: "Selector: when you deal Sneak Attack damage you may add effects from the Poison, Trip, Withdraw, Daze, Knock Out and Obscure entries (owner \"Cunning Strike\"). Each costs Sneak Attack dice, taken out of the damage before it is rolled (cost.pool \"Sneak Attack Dice\"). Save DC is 8 + DEX + PB (CLASS_DC:DEX)." },
  "Uncanny Dodge": { owner: "Rogue", minLevel: 5, kind: "reaction", trigger: "hit", econ: "reaction", effect: { halve: true },
    notes: "The attacker must be one you can see. Halve the damage, rounded down." },
  "Evasion|Rogue": { owner: "Rogue", minLevel: 7, kind: "passive", fx: { evasion: true },
    notes: "Dexterity saves for half damage only; not while Incapacitated." },
  "Reliable Talent": { owner: "Rogue", minLevel: 7, kind: "passive", fx: { reliableTalent: true },
    notes: "A d20 of 9 or lower counts as 10 on checks that use a skill or tool you are proficient in." },
  "Improved Cunning Strike": { owner: "Rogue", minLevel: 11, combat: "todo",
    notes: "Apply up to two different Cunning Strike effects to one Sneak Attack, paying each die cost. Needs the Sneak Attack engine to allow two effects whose costs fit within the dice rolled." },
  "Devious Strikes": { owner: "Rogue", minLevel: 14, combat: "none",
    notes: "Unlocks Daze, Knock Out and Obscure, whose entries carry minLevel 14." },
  "Slippery Mind": { owner: "Rogue", minLevel: 15, combat: "none",
    notes: "Wisdom and Charisma save proficiency. Applied by the rules engine (SAVE_PROF_FEATURES)." },
  "Elusive": { owner: "Rogue", minLevel: 18, kind: "passive", fx: { elusive: true },
    notes: "Attack rolls against you cannot have Advantage unless you are Incapacitated." },
  "Stroke of Luck": { owner: "Rogue", minLevel: 20, combat: "todo",
    usesFlat: 1, rest: { short: "all", long: "all" },
    notes: "When you fail a d20 Test (attack roll, ability check or saving throw), turn the roll into a 20. Needs a set-the-roll-to-20 effect key and triggers for a missed attack and a failed check as well as a failed save." },

  // Cunning Strike options (owner "Cunning Strike"). Cost is in Sneak Attack dice; none of these adds damage.
  "Poison|Cunning Strike": { owner: "Cunning Strike", minLevel: 5, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Sneak Attack Dice", n: 1 }, save: "CON", dc: "CLASS_DC:DEX",
    onFail: [{ cond: "poisoned", until: "rounds:10", repeat: "end" }],
    notes: "Needs a Poisoner's Kit on your person. Only on a hit that deals Sneak Attack damage. The poisoned target repeats the save at the end of each of its turns." },
  "Trip": { owner: "Cunning Strike", minLevel: 5, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Sneak Attack Dice", n: 1 }, save: "DEX", dc: "CLASS_DC:DEX",
    onFail: [{ cond: "prone", sizeMax: "Large" }],
    notes: "Only on a hit that deals Sneak Attack damage. Large or smaller targets." },
  "Withdraw": { owner: "Cunning Strike", minLevel: 5, combat: "zones",
    notes: "Costs 1 Sneak Attack die. Immediately after the attack, move up to half your Speed without Opportunity Attacks." },
  "Daze": { owner: "Cunning Strike", minLevel: 14, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Sneak Attack Dice", n: 2 }, save: "CON", dc: "CLASS_DC:DEX",
    onFail: [{ mod: { noBonus: true }, until: "targetTurnEnd", note: "Daze: on its next turn it can do only one of move, take an action, or take a Bonus Action. Shown as no Bonus Action; Phase 2 should also stop move plus action." }],
    notes: "Only on a hit that deals Sneak Attack damage." },
  "Knock Out": { owner: "Cunning Strike", minLevel: 14, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Sneak Attack Dice", n: 6 }, save: "CON", dc: "CLASS_DC:DEX",
    onFail: [{ cond: "unconscious", until: "nextHit", repeat: "end", note: "Knock Out: Unconscious for 1 minute or until it takes any damage; it repeats the save at the end of each of its turns. Shown as ending on the next hit." }],
    notes: "Only on a hit that deals Sneak Attack damage." },
  "Obscure": { owner: "Cunning Strike", minLevel: 14, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Sneak Attack Dice", n: 3 }, save: "DEX", dc: "CLASS_DC:DEX",
    onFail: [{ cond: "blinded", until: "targetTurnEnd" }],
    notes: "Only on a hit that deals Sneak Attack damage." },

  // ==================================================================== ROGUE (Arcane Trickster)
  "Mage Hand Legerdemain": { owner: "Arcane Trickster", minLevel: 3, combat: "exploration",
    notes: "Mage Hand as a Bonus Action, Invisible, controlled as a Bonus Action, able to make Sleight of Hand checks." },
  "Magical Ambush": { owner: "Arcane Trickster", minLevel: 9, combat: "todo",
    notes: "If you have the Invisible condition when you cast a spell on a creature, it has Disadvantage on any saving throw against that spell this turn. Needs a hook that checks the caster's Invisible condition when a spell save is rolled." },
  "Versatile Trickster": { owner: "Arcane Trickster", minLevel: 13, combat: "zones",
    notes: "When you use Cunning Strike's Trip, you can also apply it to a second creature within 5 ft of your Mage Hand. Needs positions." },
  "Spell Thief": { owner: "Arcane Trickster", minLevel: 17, kind: "reaction", trigger: "spell", econ: "reaction", target: "enemy",
    save: "INT", dc: "SPELL", usesFlat: 1, rest: { short: "none", long: "all" },
    notes: "Right after a creature casts a spell that targets you or includes you in its area. On a failed save the spell has no effect on you, and if it is level 1 or higher and of a level you can cast you also steal it: you have it prepared for 8 hours and the caster cannot cast it. The steal is not modelled." },

  // ==================================================================== ROGUE (Assassin)
  "Assassinate": { owner: "Assassin", minLevel: 3, kind: "passive", fx: { initAdv: true, firstRoundAdvantage: true },
    notes: "Advantage on Initiative. In the first round of combat, Advantage on attack rolls against any creature that has not taken a turn. If your Sneak Attack hits in that round, the target takes extra damage equal to your Rogue level, of the weapon's type; the contract has no field for that damage." },
  "Assassin's Tools": { owner: "Assassin", minLevel: 3, combat: "none",
    notes: "Disguise Kit and Poisoner's Kit, with proficiency." },
  "Infiltration Expertise": { owner: "Assassin", minLevel: 9, combat: "zones",
    notes: "Roving Aim: Steady Aim no longer sets your Speed to 0 (matters in Phase 2). Masterful Mimicry is social." },
  "Envenom Weapons": { owner: "Assassin", minLevel: 13, kind: "on-hit", trigger: "youHit", replaces: "Poison|Cunning Strike",
    cost: { pool: "Sneak Attack Dice", n: 1 }, save: "CON", dc: "CLASS_DC:DEX",
    onFail: [
      { cond: "poisoned", until: "rounds:10", repeat: "end" },
      { dmg: { dice: "2d6", type: "poison" }, note: "Envenom: 2d6 poison damage, ignoring Resistance to poison, each time the target fails the save, including the repeats at the end of its turns." }
    ],
    notes: "The Poison Cunning Strike with extra poison damage. Needs a Poisoner's Kit." },
  "Death Strike": { owner: "Assassin", minLevel: 17, combat: "todo",
    save: "CON", dc: "CLASS_DC:DEX",
    notes: "When your Sneak Attack hits in the first round of combat, the target makes a Constitution save (DC 8 + DEX + PB) or takes double damage from the attack. Needs a double-the-attack's-damage failed-save rider." },

  // ==================================================================== ROGUE (Soulknife)
  // Psionic Energy Dice: see RESOURCE_POOLS "Soulknife Energy Dice". PSI_DIE: dice shown as 1d6 (see the header).
  "Psionic Power|Psi-Bolstered Knack": { owner: "Soulknife", minLevel: 3, combat: "exploration",
    notes: "After you fail a check with a skill or tool you are proficient in, roll a Psionic Energy Die and add it; the die is spent only if the check then succeeds." },
  "Psionic Power|Psychic Whispers": { owner: "Soulknife", minLevel: 3, combat: "social",
    notes: "Magic action: telepathy with up to PB creatures for a number of hours equal to a Psionic Energy Die roll. The first use after each Long Rest costs no die." },
  "Psychic Blades": { owner: "Soulknife", minLevel: 3, kind: "attack-effect", econ: "attack", weapon: "psychic blade",
    range: [60, 120], dmg: [{ dice: "1d6+MOD_DEX", type: "psychic" }],
    notes: "Whenever you take the Attack action or make an Opportunity Attack, you can make that attack with a Psychic Blade in your free hand: Finesse, Thrown 60/120, Vex mastery (which does not count against your mastery choices). 1d6 psychic + the ability modifier used for the attack (DEX or STR, as Finesse allows). The blade vanishes after the attack. Sneak Attack applies." },
  "Psychic Blades|Second Blade": { owner: "Soulknife", minLevel: 3, kind: "attack-effect", econ: "bonus", weapon: "psychic blade",
    range: [60, 120], dmg: [{ dice: "1d4+MOD_DEX", type: "psychic" }],
    notes: "After you attack with a Psychic Blade on your turn, make a melee or ranged attack with a second blade as a Bonus Action if your other hand is free. 1d4 psychic + the ability modifier used for the attack." },
  "Soul Blades|Homing Strikes": { owner: "Soulknife", minLevel: 9, kind: "on-hit", trigger: "youMiss", econ: "none",
    cost: { pool: "Soulknife Energy Dice", n: 1 }, effect: { bonus: "1d6" },
    notes: "PSI_DIE. When a Psychic Blade attack misses, roll a Psionic Energy Die and add it to the attack roll. The die is spent only if that makes the attack hit. effect.bonus without reroll means a bonus to the roll that just missed." },
  "Soul Blades|Psychic Teleportation": { owner: "Soulknife", minLevel: 9, kind: "move", econ: "bonus",
    cost: { pool: "Soulknife Energy Dice", n: 1 }, move: { teleport: 40 },
    notes: "PSI_DIE. Bonus Action: expend a Psionic Energy Die, throw a Psychic Blade at an open space you can see up to 10 times the die roll in feet away, and teleport there. The distance is 10 ft per pip; move.teleport is 40, the average roll of a d8 (the die from level 5), because the contract can't roll it." },
  "Psychic Veil": { owner: "Soulknife", minLevel: 13, kind: "buff", econ: "action", target: "self", until: "nextHit",
    usesFlat: 1, rest: { short: "none", long: "all" }, mods: { atkAdv: true, attackersDis: true },
    notes: "Magic action: you are Invisible for 1 hour, but it ends as soon as you deal damage to a creature or force a save. Here it ends when you next deal damage (until nextHit); the engine should also end it when you force a save. Expending a Psionic Energy Die (no action) restores the use." },
  "Rend Mind": { owner: "Soulknife", minLevel: 17, kind: "on-hit", trigger: "youHit",
    save: "WIS", dc: "CLASS_DC:DEX", usesFlat: 1, rest: { short: "none", long: "all" },
    onFail: [{ cond: "stunned", until: "rounds:10", repeat: "end" }],
    notes: "Only when a Psychic Blade deals Sneak Attack damage. The stunned target repeats the save at the end of each of its turns. Expending three Psionic Energy Dice (no action) restores the use." },

  // ==================================================================== ROGUE (Thief)
  "Fast Hands": { owner: "Thief", minLevel: 3, combat: "todo",
    notes: "As a Bonus Action: a Sleight of Hand check to pick a lock, disarm a trap or pick a pocket, or the Utilize action, or the Magic action to use a magic item that needs it. In a fight only the item use matters; needs item use as a Bonus Action." },
  "Second-Story Work": { owner: "Thief", minLevel: 3, combat: "exploration",
    notes: "Climb Speed equal to your Speed, and jump distance from Dexterity." },
  "Supreme Sneak": { owner: "Thief", minLevel: 9, combat: "zones",
    notes: "Adds the Stealth Attack Cunning Strike option (1 Sneak Attack die): while you have the Invisible condition from Hide, that attack does not end it if you end the turn behind Three-Quarters Cover or Total Cover." },
  "Use Magic Device": { owner: "Thief", minLevel: 13, combat: "exploration",
    notes: "Attune to four items; a d6 roll of 6 spends no charges; use any Spell Scroll with INT (cantrip and level 1 reliably, higher levels need a DC 10 + spell level Arcana check)." },
  "Thief's Reflexes": { owner: "Thief", minLevel: 17, combat: "todo",
    notes: "You take two turns in the first round of every combat: one at your Initiative and one at your Initiative minus 10. Needs an extra turn in round 1 at a lower initiative." },

  // ==================================================================== COMBAT SUPERIORITY (maneuvers; owner "Combat Superiority")
  // Every maneuver costs one Superiority Die (cost.pool). DC is 8 + PB + STR or DEX modifier (CLASS_DC:STR|DEX).
  // You can use only one maneuver per attack.
  "Ambush": { owner: "Combat Superiority", minLevel: 3, combat: "todo",
    cost: { pool: "Superiority Dice", n: 1 },
    notes: "Add the Superiority Die to a Dexterity (Stealth) check or an Initiative roll (not while Incapacitated). The Initiative case needs a hook before combat starts; the Stealth case is exploration." },
  "Bait and Switch": { owner: "Combat Superiority", minLevel: 3, combat: "zones",
    cost: { pool: "Superiority Dice", n: 1 },
    notes: "On your turn, within 5 ft of a willing creature that is not Incapacitated and spending at least 5 ft of movement, swap places with it without Opportunity Attacks. Roll the die: you or the other creature gains that much AC until the start of your next turn. Needs an ally and positions." },
  "Commander's Strike": { owner: "Combat Superiority", minLevel: 3, kind: "special", econ: "attack", target: "ally",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    notes: "When you take the Attack action, give up one attack to have a willing creature that can see or hear you use its Reaction to make one weapon or Unarmed Strike attack, adding the die to the damage on a hit. Allies only, Phase 2." },
  "Commanding Presence": { owner: "Combat Superiority", minLevel: 3, combat: "social",
    cost: { pool: "Superiority Dice", n: 1 },
    notes: "Add the die to a Charisma (Intimidation, Performance or Persuasion) check." },
  "Disarming Attack": { owner: "Combat Superiority", minLevel: 3, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    onHit: [{ save: "STR", dc: "CLASS_DC:STR|DEX", note: "On a failed save the target drops one object of your choice that it holds; the object lands in its space." }] },
  "Distracting Strike": { owner: "Combat Superiority", minLevel: 3, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    onHit: [{ until: "srcTurnStart", note: "The next attack roll against the target by an attacker other than you has Advantage if made before the start of your next turn." }],
    notes: "The Advantage helps others only, so it is a text note; it does nothing in a one-on-one fight." },
  "Evasive Footwork": { owner: "Combat Superiority", minLevel: 3, kind: "buff", econ: "bonus", target: "self", until: "srcTurnStart",
    cost: { pool: "Superiority Dice", n: 1 }, mods: { ac: "SUP_DIE" },
    notes: "Take the Disengage action (zones) and add the rolled die to your AC until the start of your next turn." },
  "Feinting Attack": { owner: "Combat Superiority", minLevel: 3, kind: "buff", econ: "bonus", target: "enemy", until: "turnEnd",
    cost: { pool: "Superiority Dice", n: 1 },
    mods: { atkAdv: true, dmgDie: { dice: "SUP_DIE", type: "weapon", on: "weapon", once: "turn" } },
    notes: "Choose a creature within 5 ft. You have Advantage on your next attack roll against it this turn; if that attack hits, add the die to its damage. The Advantage is for that one attack roll only: the engine should end it after that roll, since turnEnd would otherwise cover every attack this turn." },
  "Goading Attack": { owner: "Combat Superiority", minLevel: 3, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    onHit: [{ save: "WIS", dc: "CLASS_DC:STR|DEX", until: "srcTurnEnd", note: "On a failed save the target has Disadvantage on attack rolls against targets other than you until the end of your next turn." }],
    notes: "The Disadvantage only matters when the target has someone else to attack, so it is a text note; it does nothing in a one-on-one fight." },
  "Lunging Attack": { owner: "Combat Superiority", minLevel: 3, combat: "zones",
    cost: { pool: "Superiority Dice", n: 1 },
    notes: "Bonus Action: Dash. If you moved at least 5 ft in a straight line right before a melee hit as part of the Attack action this turn, add the die to that hit's damage." },
  "Maneuvering Attack": { owner: "Combat Superiority", minLevel: 3, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    onHit: [{ note: "A willing creature that can see or hear you uses its Reaction to move up to half its Speed without Opportunity Attacks from the target." }],
    notes: "The move is for an ally, so it is a text note (Phase 2)." },
  "Menacing Attack": { owner: "Combat Superiority", minLevel: 3, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    onHit: [{ cond: "frightened", save: "WIS", dc: "CLASS_DC:STR|DEX", until: "srcTurnEnd" }],
    notes: "Frightened until the end of your next turn on a failed save." },
  "Parry": { owner: "Combat Superiority", minLevel: 3, kind: "reaction", trigger: "damaged", econ: "reaction",
    cost: { pool: "Superiority Dice", n: 1 }, ability: "STR|DEX", effect: { reduce: "SUP_DIE+MOD" },
    notes: "When another creature damages you with a melee attack roll, reduce the damage by the die + your STR or DEX modifier (the higher; ability: \"STR|DEX\")." },
  "Precision Attack": { owner: "Combat Superiority", minLevel: 3, kind: "on-hit", trigger: "youMiss", econ: "none",
    cost: { pool: "Superiority Dice", n: 1 }, effect: { bonus: "SUP_DIE" },
    notes: "When you miss with an attack roll, roll the die and add it to the roll, which may turn the miss into a hit. effect.bonus without reroll means a bonus to the roll that just missed." },
  "Pushing Attack": { owner: "Combat Superiority", minLevel: 3, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    onHit: [{ push: 15, save: "STR", dc: "CLASS_DC:STR|DEX", sizeMax: "Large" }],
    notes: "On a weapon or Unarmed Strike hit. A Large or smaller target that fails the save is pushed up to 15 ft directly away." },
  "Rally": { owner: "Combat Superiority", minLevel: 3, kind: "temphp", econ: "bonus", target: "ally",
    cost: { pool: "Superiority Dice", n: 1 }, temp: "SUP_DIE",
    notes: "An ally within 30 ft who can see or hear you gains Temporary HP equal to the die roll plus half your Fighter level, rounded down. The half-level part has no token and is left out of temp. Allies only, Phase 2." },
  "Riposte": { owner: "Combat Superiority", minLevel: 3, kind: "reaction", trigger: "attacked", econ: "reaction", target: "enemy", weapon: "melee",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    notes: "Offer it only after a melee attack roll against you has missed (the contract has no miss trigger). Make one melee weapon or Unarmed Strike attack against that creature; if it hits, add the die to the damage." },
  "Sweeping Attack": { owner: "Combat Superiority", minLevel: 3, combat: "todo",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    notes: "On a melee weapon or Unarmed Strike hit, choose a second creature within 5 ft of the original target and within your reach. If the original attack roll would also hit it, it takes the die roll as damage of the same type as the original attack. The damage goes to the second creature, not the target; needs a second-target damage rider and adjacency (zones). The dmg field is the intended spec, not damage to the target." },
  "Tactical Assessment": { owner: "Combat Superiority", minLevel: 3, combat: "exploration",
    cost: { pool: "Superiority Dice", n: 1 },
    notes: "Add the die to an Intelligence (History or Investigation) or Wisdom (Insight) check." },
  "Trip Attack": { owner: "Combat Superiority", minLevel: 3, kind: "on-hit", trigger: "youHit",
    cost: { pool: "Superiority Dice", n: 1 }, dmg: [{ dice: "SUP_DIE", type: "weapon" }],
    onHit: [{ cond: "prone", save: "STR", dc: "CLASS_DC:STR|DEX", sizeMax: "Large" }],
    notes: "On a weapon or Unarmed Strike hit. Large or smaller targets." }
});

// Resources that RESOURCE_USES (data_resources.js) does not name. See Combat_Schema section C.
window.RESOURCE_POOLS = Object.assign(window.RESOURCE_POOLS || {}, {
  "Superiority Dice":        { owner: "Battle Master", byLevel: { 3: 4, 7: 5, 15: 6 }, pool: true, rest: { short: "all", long: "all" } },
  "Indomitable":             { owner: "Fighter", byLevel: { 9: 1, 13: 2, 17: 3 }, rest: { short: "none", long: "all" } },
  "Uncanny Metabolism":      { owner: "Monk", formula: 1, rest: { short: "none", long: "all" } },
  "Warrior of the Gods":     { owner: "Path of the Zealot", byLevel: { 3: 4, 6: 5, 12: 6, 17: 7 }, pool: true, rest: { short: "none", long: "all" } },
  "Wholeness of Body":       { owner: "Warrior of the Open Hand", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  "Flurry of Healing and Harm": { owner: "Warrior of Mercy", formula: "WIS_MIN1", rest: { short: "none", long: "all" } },
  "Psi Warrior Energy Dice": { owner: "Psi Warrior", byLevel: { 3: 4, 5: 6, 9: 8, 11: 8, 13: 10, 17: 12 }, pool: true, rest: { short: "one", long: "all" } },
  "Soulknife Energy Dice":   { owner: "Soulknife", byLevel: { 3: 4, 5: 6, 9: 8, 11: 8, 13: 10, 17: 12 }, pool: true, rest: { short: "one", long: "all" } },
  // Marker pool, not a rest pool: the Rogue's Sneak Attack dice (1d6 at level 1, 2d6 at 3, 3d6 at 5 ... 10d6 at 19).
  // Cunning Strike options "spend" n of them from the hit's Sneak Attack damage before it is rolled.
  "Sneak Attack Dice":       { owner: "Rogue", byLevel: { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5, 11: 6, 13: 7, 15: 8, 17: 9, 19: 10 }, pool: true, rest: { short: "all", long: "all" } }
});

// Recharge for the RESOURCE_USES entries these classes own.
window.RESOURCE_REST = Object.assign(window.RESOURCE_REST || {}, {
  "Rage":         { short: "one", long: "all" },
  "Second Wind":  { short: "one", long: "all" },
  "Action Surge": { short: "all", long: "all" },
  "Monk's Focus": { short: "all", long: "all" }
});
/*
 * data/fx/feats_species.js
 * Combat data (docs/Combat_Schema.md sections B and C) for every feat in data/data_feats.js (origin, general,
 * fightingStyles, epicBoons) and every species trait in data/data_species_backgrounds.js.
 *
 * Registers: window.ACTION_FX, window.RESOURCE_POOLS, window.RESOURCE_REST ("Breath Weapon" only).
 *
 * SOURCES (2024 rules only; every number below was checked against these, not memory)
 *   - dnd2024.wikidot.com, pages feat:<name> and species:<name> (all feats, all ten species)
 *   - D&D Beyond free rules, "Character Origins" page (nine SRD species; Aasimar is not in the SRD)
 *   - open5e v2 API, document srd-2024 (the SRD 5.2 feats, boons and fighting styles)
 *   - 2024 Player's Handbook feat text as mirrored by the 5etools XPHB data (prerequisites and wording)
 *   Aasimar was verified against wikidot only.
 *
 * NOT IN THIS FILE, ON PURPOSE
 *   - Names the engine applies itself: Archery, Defense, Dueling, Great Weapon Fighting, Thrown Weapon Fighting,
 *     Two-Weapon Fighting, Unarmed Fighting (its start-of-turn 1d4 to a grappled creature is not listed anywhere;
 *     check the engine covers it), Ability Score Improvement, and Great Weapon Master's extra damage.
 *   - Fighting Style feats missing from data_feats.js: Blessed Warrior and Druidic Warrior (see the report).
 *
 * CONVENTIONS USED (beyond what the schema spells out)
 *   - "owner" for species is "species:<Species>". A trait shared by several species (Darkvision) has one entry.
 *   - Variant keys are "Trait|<option name exactly as in data_species_backgrounds.js>":
 *       Breath Weapon|<ancestry>, Damage Resistance|<ancestry>, Celestial Revelation|<option>,
 *       Giant Ancestry|<option>, Fiendish Legacy|<legacy>.
 *   - combat:"zones" marks effects that are movement, vision or light only. They wait for the zone rules (Phase 2).
 *     combat:"todo" marks something that matters in a fight and cannot be expressed; notes say what.
 *   - Zone data (Combat_Schema F.2): Boon of Dimensional Travel is now kind "move" (teleport 30, once per turn). The other six
 *     combat:"zones" entries stay: Athlete and Speedy (speeds and Opportunity Attack rules), Blind Fighting, Boon of Truesight and
 *     Boon of the Night Spirit (vision and light rules the engine owns), and Halfling Nimbleness (moving through a larger
 *     creature's space, which a zone doesn't track).
 *   - econ:"none" marks a benefit that happens at a rest or before the fight and is not an action in the fight.
 *   - once:"turn" means once per turn (the same meaning as mods.dmgDie.once).
 *   - minLevel on a species trait is CHARACTER level (species have no class level).
 *   - diceByLevel: { characterLevel: "NdM" } replaces dmg[0].dice from that character level on (Breath Weapon).
 *     The schema lists the key but not its shape; this is the shape used here.
 *   - kind:"special" means the engine must handle the feature by name; the notes are the rule text to implement.
 *   - MOD for a feat that raises a choice of ability means the ability the player raised with it.
 *   - Heal dice written 1d8 for Healer and Durable are stand-ins for the character's own Hit Die size.
 *   - A feature with two separate combat parts has ONE entry (the schema allows one per key). The main part is
 *     modelled; the other part is in notes. These are listed in the report: Shield Master (Interpose Shield),
 *     Boon of Recovery (Recover Vitality), Boon of Fortitude (extra healing), Mage Slayer (Concentration
 *     Breaker), Polearm Master (Reactive Strike), War Caster (Reactive Spell), Healer (Healing Rerolls),
 *     Durable (Defy Death), Sentinel (Disengage trigger), Inspiring Leader and Chef (rest effects).
 *
 * SIMPLIFICATIONS
 *   - Hit Point effects the builder already applies are listed as combat:"none" with a note: Tough, Dwarven
 *     Toughness, Boon of Fortitude's +40.
 *   - AC and speed effects the gear engine already applies are combat:"none": Medium Armor Master, Speedy's
 *     +10 Speed, Boon of Speed's +30 Speed, Wood Elf's 35 Speed. Armor and weapon training is combat:"none".
 *   - Choices that live on the character (Elemental Adept's type, Boon of Energy Resistance's two types, the
 *     spells chosen with Magic Initiate, Fey-Touched and Shadow-Touched) are not in the data. Entries name the
 *     rule and the engine reads the player's pick.
 *   - Poisoner is modelled as a self buff applied with a Bonus Action that adds a rider to the next damage dealt
 *     with the weapon. Doses are counted per Long Rest; the 50 GP cost and 1 hour of brewing are not tracked.
 *   - Charger and Shield Master offer one of their two options (1d8 damage; prone). The push option is in notes.
 *   - Grappler's and Shield Master's DCs use CLASS_DC:STR (8 + STR modifier + PB), as the feats say.
 *     Poisoner and Telekinetic use the ability the feat raised; the higher of the allowed abilities stands in.
 *   - Large Form: the Large size itself (space, reach, grapple size limits) is not modelled; Speed and the
 *     Strength-check Advantage are.
 *   - Fly Speed has no modifier key, so Heavenly Wings and Draconic Flight only record the toggle and its limit.
 *   - Inner Radiance: the end-of-turn damage to creatures within 10 feet is recorded as dmg + area on the toggle
 *     (no save); the schema has no "when" key for features, so the timing is in notes.
 *   - Elven Lineage, and the spells in Fiendish Legacy and Gnomish Lineage, are not expressible as one entry per
 *     key because they grant two or more spells; the free casts must come from SPECIES_SPELLS
 *     (data/data_innate_magic.js). See the report.
 *   - Feats and traits with no fight effect (skills, tools, languages, crafting, rest-time utility) are
 *     combat:"none", "exploration" or "social".
 */

window.ACTION_FX = Object.assign(window.ACTION_FX || {}, {

  // =====================================================================================================
  // ORIGIN FEATS
  // =====================================================================================================
  "Alert": { owner: "feat", kind: "passive", fx: { initBonus: "PB" },
    notes: "Initiative Proficiency: add PB to your Initiative roll. Initiative Swap (trade Initiative with a willing ally in the same combat, neither of you Incapacitated) needs a party and waits for Phase 2." },

  "Crafter": { owner: "feat", combat: "none",
    notes: "Three Artisan's Tools proficiencies, 20 percent discount on nonmagical items, and Fast Crafting after a Long Rest." },

  "Healer": { owner: "feat", kind: "heal", econ: "action", target: "creature", heal: "1d8+PB",
    notes: "Battle Medic: take the Utilize action with a Healer's Kit (kit uses are not tracked) on a creature within 5 feet. That creature spends one of its Hit Dice, you roll the die, and it regains the roll plus PB. The 1d8 is a stand-in: roll the creature's own Hit Die size and spend one of its Hit Dice. Healing Rerolls: you can reroll a 1 on any healing die from this feat or from your spells (engine work: healing-die reroll)." },

  "Lucky": { owner: "feat", kind: "passive", fx: { luckPoints: "PB" }, uses: "Luck Points",
    notes: "Spend 1 Luck Point to give yourself Advantage on a d20 Test, or to impose Disadvantage on an attack roll made against you. Points return on a Long Rest." },

  "Magic Initiate (Cleric)": { owner: "feat", kind: "special", uses: "Magic Initiate (Cleric)",
    notes: "Two Cleric cantrips and one level 1 Cleric spell, chosen on the sheet. The level 1 spell is always prepared and can be cast once per Long Rest without a slot (or with slots). The spell is the player's choice, so this cannot be a free-cast entry: the engine should add one free cast of the chosen spell and count it against this pool." },

  "Magic Initiate (Druid)": { owner: "feat", kind: "special", uses: "Magic Initiate (Druid)",
    notes: "Two Druid cantrips and one level 1 Druid spell, chosen on the sheet. The level 1 spell is always prepared and can be cast once per Long Rest without a slot (or with slots). The spell is the player's choice, so this cannot be a free-cast entry: the engine should add one free cast of the chosen spell and count it against this pool." },

  "Magic Initiate (Wizard)": { owner: "feat", kind: "special", uses: "Magic Initiate (Wizard)",
    notes: "Two Wizard cantrips and one level 1 Wizard spell, chosen on the sheet. The level 1 spell is always prepared and can be cast once per Long Rest without a slot (or with slots). The spell is the player's choice, so this cannot be a free-cast entry: the engine should add one free cast of the chosen spell and count it against this pool." },

  "Musician": { owner: "feat", kind: "passive", effect: { heroicInspiration: "PB" },
    notes: "At the end of a Short or Long Rest, give Heroic Inspiration to up to PB allies who hear the song. Only matters with a party (Phase 2). Assumed meaning of effect.heroicInspiration: grant that many allies Heroic Inspiration after a rest." },

  "Savage Attacker": { owner: "feat", kind: "special", trigger: "youHit", once: "turn",
    notes: "Once per turn when you hit with a weapon, roll the weapon's damage dice twice and use either total. Engine work: roll the whole damage twice and keep the higher." },

  "Skilled": { owner: "feat", combat: "none",
    notes: "Proficiency in any three skills or tools. Repeatable." },

  "Tavern Brawler": { owner: "feat", kind: "on-hit", trigger: "youHit", econ: "free", once: "turn", onHit: [{ push: 5 }],
    notes: "Push: when an Unarmed Strike hits as part of the Attack action on your turn, also push the target 5 feet away (once per turn). Enhanced Unarmed Strike (1d4 + STR Bludgeoning instead of the normal damage) is in the gear engine. Damage Rerolls: reroll a 1 on an Unarmed Strike damage die and keep the new roll (engine work: damage-die reroll). Improvised weapon proficiency is a sheet item." },

  "Tough": { owner: "feat", combat: "none",
    notes: "Hit Point maximum +2 per character level, applied by maxHP() in src/engine_rules.js. Nothing for the combat engine to add." },

  // =====================================================================================================
  // GENERAL FEATS (Ability Score Improvement is skipped: the engine covers it)
  // =====================================================================================================
  "Actor": { owner: "feat", combat: "social",
    notes: "Advantage on Deception and Performance checks to pass as someone else; mimic voices and sounds." },

  "Athlete": { owner: "feat", combat: "zones",
    notes: "Climb Speed equal to your Speed. Standing up from Prone costs 5 feet of movement. Running jumps need only 5 feet of movement. Apply the stand-up cost and jumps when zones arrive." },

  "Charger": { owner: "feat", kind: "on-hit", trigger: "youHit", econ: "free", once: "turn", dmg: [{ dice: "1d8", type: "weapon" }],
    notes: "Charge Attack: after moving at least 10 feet in a straight line toward the target immediately before a melee hit made as part of the Attack action, choose +1d8 damage OR push the target up to 10 feet (target no more than one size larger than you). Only the damage option is modelled. Zone approximation for the movement: you changed zones this turn. Improved Dash (+10 feet of Speed when you take the Dash action) waits for zones." },

  "Chef": { owner: "feat", kind: "temphp", econ: "bonus", target: "self", temp: "PB", uses: "Bolstering Treats",
    notes: "Bolstering Treats: eat one treat as a Bonus Action to gain PB temporary HP. PB treats are made when you finish a Long Rest (or with 1 hour of work) and last 8 hours; an ally eats theirs on their own turn. Replenishing Meal (food cooked in a Short Rest gives 4 + PB creatures an extra 1d8 HP when they spend Hit Dice) belongs to the rest rules and is not modelled." },

  "Crossbow Expert": { owner: "feat", kind: "special",
    notes: "Engine work, three rules. (1) Ignore the Loading property of the hand, light and heavy crossbows, so Extra Attack works with them and you can load with no free hand. (2) Being within 5 feet of an enemy does not impose Disadvantage on your crossbow attack rolls. (3) When you make the extra attack of the Light property with a crossbow that has Light, add your ability modifier to its damage." },

  "Crusher": { owner: "feat", kind: "on-hit", trigger: "youHit", econ: "free", once: "turn",
    onHit: [{ push: 5 }], onCrit: [{ mod: { attackersAdv: true }, until: "srcTurnStart" }],
    notes: "Only for attacks that deal Bludgeoning damage. Push: once per turn move the target 5 feet to an unoccupied space if it is no more than one size larger than you. Enhanced Critical: after a Bludgeoning critical hit, attack rolls against the target have Advantage until the start of your next turn." },

  "Defensive Duelist": { owner: "feat", kind: "reaction", econ: "reaction", trigger: "hit", target: "self",
    mods: { ac: "PB" }, until: "srcTurnStart",
    notes: "Parry: needs a Finesse weapon in hand and a melee attack that hits you. The bonus counts against the triggering attack, so it can turn the hit into a miss, and it applies to melee attacks against you until the start of your next turn." },

  "Dual Wielder": { owner: "feat", kind: "extra-attacks", econ: "bonus", n: 1,
    notes: "Enhanced Dual Wielding: after you take the Attack action and attack with a Light weapon, make one extra attack as a Bonus Action with a different melee weapon that lacks the Two-Handed property (it does not need Light). Do not add the ability modifier to its damage unless it is negative. Quick Draw: draw or stow two such weapons at once." },

  "Durable": { owner: "feat", kind: "heal", econ: "bonus", target: "self", heal: "1d8",
    notes: "Speedy Recovery: spend one of your Hit Dice, roll it, and regain HP equal to the roll (no Constitution modifier in 2024). The 1d8 is a stand-in for your own Hit Die size. Defy Death: Advantage on Death Saving Throws (engine work: the schema has no death-save Advantage key)." },

  "Elemental Adept": { owner: "feat", kind: "special",
    notes: "The player picks Acid, Cold, Fire, Lightning or Thunder (repeatable with a different type each time). Your spells ignore Resistance to that type, and you treat any 1 on that type's spell damage dice as a 2. Engine work: a per-character damage-type choice, ignore-resistance, and a damage-die floor." },

  "Fey-Touched": { owner: "feat", kind: "free-cast", spell: "Misty Step", econ: "bonus", uses: "Fey-Touched",
    notes: "Misty Step is always prepared and can be cast once per Long Rest without a slot (or with slots). The feat also gives one level 1 Divination or Enchantment spell the player chooses, with its own free cast per Long Rest; the engine should add that one from the player's pick." },

  "Grappler": { owner: "feat", kind: "on-hit", trigger: "youHit", econ: "free", once: "turn",
    onHit: [{ cond: "grappled", save: "STR", dc: "CLASS_DC:STR", until: "escape", escape: "CLASS_DC:STR" }],
    notes: "Punch and Grab: when an Unarmed Strike hits as part of the Attack action on your turn, you can use both the Damage and the Grapple option (once per turn). The target saves with Strength or Dexterity, its choice, and must be no more than one size larger than you. Attack Advantage: Advantage on attack rolls against a creature you are grappling (engine work: conditional Advantage). Fast Wrestler: moving a creature you grapple costs no extra movement if it is your size or smaller." },

  "Great Weapon Master": { owner: "feat", kind: "extra-attacks", econ: "bonus", trigger: "killed", n: 1,
    notes: "Hew only. The engine applies Heavy Weapon Mastery (extra damage equal to PB on every Heavy weapon hit made as part of the Attack action on your turn, with no once-per-turn limit in 2024). Hew: immediately after a Critical Hit with a melee weapon or after reducing a creature to 0 HP with one, make one attack with the same weapon as a Bonus Action. A critical hit also triggers it; the trigger field holds one value, so it shows the kill." },

  "Heavily Armored": { owner: "feat", combat: "none",
    notes: "Heavy armor training. Applied by the gear engine." },

  "Heavy Armor Master": { owner: "feat", kind: "passive", fx: { heavyArmorMaster: true },
    notes: "While you wear Heavy armor, reduce the Bludgeoning, Piercing and Slashing damage of each attack that hits you by PB." },

  "Inspiring Leader": { owner: "feat", kind: "temphp", econ: "none", target: "allies", n: 6, temp: "LEVEL+MOD",
    notes: "When you finish a Short or Long Rest, up to six allies within 30 feet who see the performance (you can be one) gain temporary HP equal to your character level plus the modifier of the ability this feat raised (Wisdom or Charisma; MOD is that one). Applied before a fight, not during one." },

  "Keen Mind": { owner: "feat", combat: "exploration",
    notes: "Proficiency or Expertise in one Intelligence skill, and the Study action as a Bonus Action." },

  "Lightly Armored": { owner: "feat", combat: "none",
    notes: "Light armor and Shield training. Applied by the gear engine." },

  "Mage Slayer": { owner: "feat", kind: "reaction", econ: "free", trigger: "failedSave", uses: "Guarded Mind",
    notes: "Guarded Mind: when you fail an Intelligence, Wisdom or Charisma saving throw, you can succeed instead; once per Short or Long Rest. The schema has no 'succeed instead' effect key (engine work). Concentration Breaker: a creature you damage has Disadvantage on the saving throw to keep Concentration (engine work: no concentration-disadvantage key)." },

  "Martial Weapon Training": { owner: "feat", combat: "none",
    notes: "Martial weapon proficiency. Applied by the gear engine." },

  "Medium Armor Master": { owner: "feat", combat: "none",
    notes: "In Medium armor you add up to +3 Dexterity to AC instead of +2 (needs Dexterity 16 or more, which is when the modifier reaches +3). Applied by the gear engine (src/engine_gear.js)." },

  "Moderately Armored": { owner: "feat", combat: "none",
    notes: "Medium armor training only in 2024 (no Shields). Applied by the gear engine, which also grants Shields: see the report." },

  "Mounted Combatant": { owner: "feat", combat: "none",
    notes: "Needs a mount (Advantage against smaller unmounted creatures, the mount takes no damage on a successful Dexterity save and half on a failure, and you can redirect an attack on the mount to yourself). Mounts are not modelled." },

  "Observant": { owner: "feat", combat: "exploration",
    notes: "Proficiency or Expertise in Insight, Investigation or Perception, and the Search action as a Bonus Action." },

  "Piercer": { owner: "feat", kind: "special", trigger: "youHit", once: "turn",
    notes: "Only for attacks that deal Piercing damage. Puncture: once per turn, reroll one of the attack's damage dice and use the new roll. Enhanced Critical: on a Piercing critical hit, roll one extra damage die of the weapon's size. Engine work: damage-die reroll and a crit extra die." },

  "Poisoner": { owner: "feat", kind: "buff", econ: "bonus", target: "self", uses: "Poison Doses", until: "nextHit",
    save: "CON", dc: "CLASS_DC:DEX|INT", onFail: [{ dmg: { dice: "2d8", type: "poison" } }, { cond: "poisoned", until: "srcTurnEnd" }],
    notes: "Brew Poison: apply one dose to a weapon or ammunition as a Bonus Action. It lasts 1 minute or until you deal damage with the item. The next creature you damage with it saves (the save and onFail belong to that hit, not to applying the dose): on a failure it takes 2d8 Poison damage and is Poisoned until the end of your next turn. DC = 8 + the modifier of the ability the feat raised (Dexterity or Intelligence) + PB. Potent Poison: your Poison damage ignores Resistance (engine work: ignore-resistance). Doses are counted per Long Rest; the 1 hour and 50 GP of brewing are not tracked." },

  "Polearm Master": { owner: "feat", kind: "attack-effect", econ: "bonus", atk: true, ability: "STR", dmg: [{ dice: "1d4+MOD", type: "bludgeoning" }],
    notes: "Pole Strike: right after you take the Attack action with a Quarterstaff, a Spear or a weapon with Heavy and Reach, make a melee attack with the opposite end as a Bonus Action. It uses the weapon attack roll, deals Bludgeoning damage, and the damage die is a d4. Reactive Strike (a Reaction melee attack against a creature that enters your reach) does not fit the zone rules, where reach does not cross zones, so it is not modelled." },

  "Resilient": { owner: "feat", combat: "none",
    notes: "+1 to the chosen ability and saving throw proficiency in it. Applied by the sheet (savePicks)." },

  "Ritual Caster": { owner: "feat", combat: "exploration",
    notes: "PB level 1 ritual spells always prepared, and one cast per Long Rest at the normal casting time without a slot." },

  "Sentinel": { owner: "feat", kind: "reaction", econ: "reaction", trigger: "allyDamaged", target: "enemy", atk: true,
    onHit: [{ mod: { speedMult: 0 }, until: "turnEnd" }],
    notes: "Guardian: right after a creature within 5 feet of you hits a target other than you with an attack, or takes the Disengage action, make an Opportunity Attack against it (this uses your Reaction). The trigger field shows the first case; the Disengage case also triggers it. Halt: when your Opportunity Attack hits, the creature's Speed becomes 0 for the rest of the current turn." },

  "Shadow-Touched": { owner: "feat", kind: "free-cast", spell: "Invisibility", econ: "action", uses: "Shadow-Touched",
    notes: "Invisibility is always prepared and can be cast once per Long Rest without a slot (or with slots). The feat also gives one level 1 Illusion or Necromancy spell the player chooses, with its own free cast per Long Rest; the engine should add that one from the player's pick." },

  "Sharpshooter": { owner: "feat", kind: "special",
    notes: "Engine work, three rules for Ranged weapon attacks. (1) Long range does not impose Disadvantage. (2) Being within 5 feet of an enemy does not impose Disadvantage. (3) Ignore Half Cover and Three-Quarters Cover." },

  "Shield Master": { owner: "feat", kind: "on-hit", trigger: "youHit", econ: "free", once: "turn",
    onHit: [{ cond: "prone", save: "STR", dc: "CLASS_DC:STR" }],
    notes: "Shield Bash: when you hit a creature within 5 feet with a Melee weapon as part of the Attack action and a Shield is equipped, it makes a Strength save; on a failure you either push it 5 feet or knock it Prone (your choice; Prone is modelled). Once per turn, and no action needed. Interpose Shield (a Reaction: when you succeed on a Dexterity save against an effect that deals half damage on a success, take no damage, while holding a Shield) is a second reaction entry the schema cannot hold here (engine work)." },

  "Skill Expert": { owner: "feat", combat: "none",
    notes: "One skill proficiency and one Expertise. Applied by the sheet." },

  "Skulker": { owner: "feat", kind: "passive", mods: { checkAdv: ["Stealth"] },
    notes: "Fog of War: Advantage on the Dexterity (Stealth) check you make as part of the Hide action during combat; the engine should apply it to Hide only. Blindsight 10 feet and Sniper (an attack roll that misses while you are hidden does not reveal your location) wait for the vision rules." },

  "Slasher": { owner: "feat", kind: "on-hit", trigger: "youHit", econ: "free", once: "turn",
    onHit: [{ mod: { speed: -10 }, until: "srcTurnStart" }], onCrit: [{ mod: { atkDis: true }, until: "srcTurnStart" }],
    notes: "Only for attacks that deal Slashing damage. Hamstring: once per turn reduce the target's Speed by 10 feet until the start of your next turn. Enhanced Critical: after a Slashing critical hit, the target has Disadvantage on attack rolls until the start of your next turn." },

  "Speedy": { owner: "feat", combat: "zones",
    notes: "+10 Speed is applied by the gear engine. Dash ignores Difficult Terrain for the rest of the turn, and Opportunity Attacks have Disadvantage against you: both wait for zones." },

  "Spell Sniper": { owner: "feat", kind: "special",
    notes: "Engine work, three rules for spells that need an attack roll. (1) Ignore Half Cover and Three-Quarters Cover. (2) Being within 5 feet of an enemy does not impose Disadvantage. (3) A spell with a range of at least 10 feet has its range increased by 60 feet." },

  "Telekinetic": { owner: "feat", kind: "save-effect", econ: "bonus", target: "enemy", save: "STR", dc: "CLASS_DC:INT|WIS|CHA",
    onFail: [{ push: 5 }],
    notes: "Telekinetic Shove: one creature you can see within 30 feet makes a Strength save or moves 5 feet toward or away from you (your choice; recorded as a push). DC = 8 + the ability modifier the feat raised + PB; the highest of Intelligence, Wisdom and Charisma stands in. Minor Telekinesis (Mage Hand) is a cantrip with no fight use." },

  "Telepathic": { owner: "feat", combat: "exploration",
    notes: "Telepathic Utterance within 60 feet, and Detect Thoughts once per Long Rest without a slot." },

  "War Caster": { owner: "feat", kind: "passive", fx: { concAdv: true },
    notes: "Advantage on Constitution saves to keep Concentration. Somatic components with weapons or a Shield in hand are a sheet rule. Reactive Spell (cast a one-action spell at a creature that provokes an Opportunity Attack instead of attacking) needs creatures leaving reach and is not modelled." },

  "Weapon Master": { owner: "feat", combat: "none",
    notes: "Grants the mastery property of one extra weapon kind, changeable on a Long Rest. The mastery selection lives with the weapon mastery rules the engine applies itself." },

  // =====================================================================================================
  // FIGHTING STYLES (the seven attack and damage styles are applied by the gear engine and have no entry)
  // =====================================================================================================
  "Blind Fighting": { owner: "fighting-style", combat: "zones",
    notes: "Blindsight 10 feet: you see anything within 10 feet that is not behind Total Cover, even when Blinded, in Darkness, or when the creature is Invisible. Used when zones work out who can see whom." },

  "Interception": { owner: "fighting-style", kind: "reaction", econ: "reaction", trigger: "allyDamaged", target: "ally",
    effect: { reduce: "1d10+PB" },
    notes: "When a creature you can see hits another creature within 5 feet of you with an attack roll, reduce the damage to that creature by 1d10 + PB. You must be holding a Shield or a Simple or Martial weapon." },

  "Protection": { owner: "fighting-style", kind: "reaction", econ: "reaction", trigger: "allyAttacked", target: "ally",
    mods: { attackersDis: true }, until: "srcTurnStart",
    notes: "When a creature you can see attacks a target other than you within 5 feet of you, and you hold a Shield, impose Disadvantage on that attack roll. Disadvantage also applies to all other attack rolls against the target until the start of your next turn if you stay within 5 feet of it." },

  // =====================================================================================================
  // EPIC BOONS
  // =====================================================================================================
  "Boon of Combat Prowess": { owner: "epic-boon", kind: "on-hit", trigger: "youMiss", econ: "free", once: "turn",
    notes: "Peerless Aim: when you miss with an attack roll, you can hit instead (a normal hit, not a critical). After you use it you cannot use it again until the start of your next turn, so it is once per round; once:turn is the closest key." },

  "Boon of Dimensional Travel": { owner: "epic-boon", kind: "move", econ: "free", once: "turn", move: { teleport: 30 },
    notes: "Blink Steps: immediately after you take the Attack action or the Magic action, teleport up to 30 feet to an unoccupied space you can see. There is no limit on uses; here it is once per turn, and the engine doesn't check that you took the Attack or Magic action first." },

  "Boon of Energy Resistance": { owner: "epic-boon", kind: "reaction", econ: "reaction", trigger: "damaged", target: "enemy",
    save: "DEX", dc: "CLASS_DC:CON",
    dmg: [{ dice: "2d12+MOD_CON", type: ["acid", "cold", "fire", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder"] }],
    notes: "Energy Redirection: when you take damage of one of your two chosen types, direct damage of that type at a creature you can see within 60 feet that is not behind Total Cover: it saves with Dexterity or takes 2d12 + Constitution modifier of that type, with nothing on a success (the type list is the nine allowed types; use the type of the damage you took). Energy Resistances: Resistance to two of those nine types, chosen by the player and changeable after a Long Rest. The choice is not in the data, so the Resistance is engine work (a per-character choice)." },

  "Boon of Fate": { owner: "epic-boon", kind: "reaction", econ: "free", trigger: "attackRoll", target: "creature", uses: "Boon of Fate",
    effect: { subtract: "2d4", bonus: "2d4" },
    notes: "Improve Fate: when you or another creature within 60 feet succeeds on or fails a D20 Test, roll 2d4 and add it to or subtract it from the d20 roll (subtract to make an enemy miss or fail, add to help yourself or an ally). Applies to any D20 Test; the trigger covers attack rolls only. It is regained when you roll Initiative or finish a Short or Long Rest, so it is once per fight. Assumed meaning of effect: subtract is used on enemies, bonus on allies." },

  "Boon of Fortitude": { owner: "epic-boon", combat: "none",
    notes: "Hit Point maximum +40 is applied by maxHP() (FEAT_EFFECTS hpMax). Fortified Health also adds your Constitution modifier to HP you regain, once until the start of your next turn; that is not applied (engine work: healing bonus)." },

  "Boon of Irresistible Offense": { owner: "epic-boon", kind: "special",
    notes: "Overcome Defenses: your Bludgeoning, Piercing and Slashing damage ignores Resistance. Overwhelming Strike: when you roll a 20 on the d20 of an attack roll you can deal extra damage equal to the ability score this boon raised (Strength or Dexterity, up to 30), of the attack's damage type. Engine work: ignore-resistance, and a token for an ability score (SCORE_STR, SCORE_DEX)." },

  "Boon of Recovery": { owner: "epic-boon", kind: "reaction", econ: "free", trigger: "zero", uses: "Boon of Recovery",
    effect: { survive: true, hpOnSurvive: "half" },
    notes: "Last Stand: when you would be reduced to 0 HP, drop to 1 HP instead and regain HP equal to half your Hit Point maximum (hpOnSurvive 'half' means 1 HP plus half the maximum). Once per Long Rest. Recover Vitality (not modelled here, engine work): a pool of ten d10s; as a Bonus Action spend any number, roll them and regain that total; refills on a Long Rest. The pool is defined as 'Recover Vitality' in RESOURCE_POOLS." },

  "Boon of Skill": { owner: "epic-boon", combat: "none",
    notes: "Proficiency in all skills and one Expertise. Applied by the sheet." },

  "Boon of Speed": { owner: "epic-boon", kind: "extra-action", econ: "bonus",
    notes: "Escape Artist: take the Disengage action as a Bonus Action; it also ends the Grappled condition on you. The +30 Speed (Quickness) is applied by the gear engine." },

  "Boon of Spell Recall": { owner: "epic-boon", kind: "special",
    notes: "Free Casting: whenever you cast a spell with a level 1 to 4 slot, roll 1d4; if the roll equals the slot's level, the slot is not expended. Engine work: a slot refund check when a slot is spent." },

  "Boon of the Night Spirit": { owner: "epic-boon", combat: "zones",
    notes: "Both benefits need Dim Light or Darkness, which zones set. Merge with Shadows: a Bonus Action to become Invisible, ending right after you take an action, Bonus Action or Reaction. Shadowy Form: Resistance to all damage except Psychic and Radiant. Do not apply either until the zone has that light." },

  "Boon of Truesight": { owner: "epic-boon", combat: "zones",
    notes: "Truesight 60 feet. Used when zones work out who can see whom." },

  // =====================================================================================================
  // SPECIES TRAITS
  // =====================================================================================================
  "Darkvision": { owner: "species:Aasimar", combat: "exploration",
    notes: "Shared by Aasimar, Dragonborn, Dwarf, Elf, Gnome, Orc and Tiefling (not Goliath, Halfling or Human). 60 feet; 120 feet for Dwarf and Orc, and for the Drow lineage. Only matters once zones set light (Phase 2)." },

  // ---- Aasimar
  "Celestial Resistance": { owner: "species:Aasimar", kind: "passive", fx: { resist: ["necrotic", "radiant"] } },

  "Healing Hands": { owner: "species:Aasimar", kind: "heal", econ: "action", target: "creature", heal: "PBd4", uses: "Healing Hands",
    notes: "Magic action: touch a creature; roll PB d4s and it regains that total in HP. Once per Long Rest." },

  "Light Bearer": { owner: "species:Aasimar", combat: "exploration",
    notes: "The Light cantrip, Charisma as the casting ability." },

  "Celestial Revelation|Heavenly Wings": { owner: "species:Aasimar", kind: "toggle", econ: "bonus", minLevel: 3, uses: "Celestial Revelation", until: "rounds:10",
    mods: { dmgDie: { dice: "PB", type: "radiant", on: "any", once: "turn" } },
    notes: "From character level 3, once per Long Rest, for 1 minute (you can end it early). Once on each of your turns, add PB Radiant damage to one target you damage with an attack or a spell. Spectral wings give a Fly Speed equal to your Speed (no key for Fly Speed, so it is not applied)." },

  "Celestial Revelation|Inner Radiance": { owner: "species:Aasimar", kind: "toggle", econ: "bonus", minLevel: 3, uses: "Celestial Revelation", until: "rounds:10",
    mods: { dmgDie: { dice: "PB", type: "radiant", on: "any", once: "turn" } },
    area: { shape: "emanation", size: 10 }, dmg: [{ dice: "PB", type: "radiant" }],
    notes: "From character level 3, once per Long Rest, for 1 minute. Once on each of your turns, add PB Radiant damage to one target you damage with an attack or a spell (the mods entry). The area and dmg describe a second effect: at the end of each of YOUR turns, every creature within 10 feet takes PB Radiant damage with no save. They are not damage on activation. You shed Bright Light in 10 feet and Dim Light for 10 feet more." },

  "Celestial Revelation|Necrotic Shroud": { owner: "species:Aasimar", kind: "toggle", econ: "bonus", minLevel: 3, uses: "Celestial Revelation", until: "rounds:10",
    mods: { dmgDie: { dice: "PB", type: "necrotic", on: "any", once: "turn" } },
    area: { shape: "emanation", size: 10 }, save: "CHA", dc: "CLASS_DC:CHA", onFail: [{ cond: "frightened", until: "srcTurnEnd" }],
    notes: "From character level 3, once per Long Rest, for 1 minute. Once on each of your turns, add PB Necrotic damage to one target you damage with an attack or a spell. When you transform, each creature other than your allies within 10 feet makes a Charisma save or is Frightened until the end of your next turn. The save and onFail apply once, on activation." },

  // ---- Dragonborn
  "Draconic Ancestry": { owner: "species:Dragonborn", combat: "none",
    notes: "The choice that sets the damage type of Breath Weapon and Damage Resistance. Those traits have one entry per ancestry." },

  "Breath Weapon|Black": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "acid" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|Blue": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "lightning" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|Brass": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "fire" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|Bronze": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "lightning" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|Copper": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "acid" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|Gold": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "fire" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|Green": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "poison" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|Red": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "fire" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|Silver": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "cold" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },
  "Breath Weapon|White": { owner: "species:Dragonborn", kind: "save-effect", econ: "attack", uses: "Breath Weapon", target: "area", area: { shape: "cone", size: 15 },
    save: "DEX", dc: "CLASS_DC:CON", half: true, dmg: [{ dice: "1d10", type: "cold" }], diceByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    notes: "Replaces one attack of the Attack action. You choose each time between a 15-foot cone and a 30-foot line that is 5 feet wide (the area here is the cone). DC = 8 + Constitution modifier + PB. PB uses per Long Rest." },

  "Damage Resistance|Black":  { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["acid"] } },
  "Damage Resistance|Blue":   { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["lightning"] } },
  "Damage Resistance|Brass":  { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["fire"] } },
  "Damage Resistance|Bronze": { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["lightning"] } },
  "Damage Resistance|Copper": { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["acid"] } },
  "Damage Resistance|Gold":   { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["fire"] } },
  "Damage Resistance|Green":  { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["poison"] } },
  "Damage Resistance|Red":    { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["fire"] } },
  "Damage Resistance|Silver": { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["cold"] } },
  "Damage Resistance|White":  { owner: "species:Dragonborn", kind: "passive", fx: { resist: ["cold"] } },

  "Draconic Flight": { owner: "species:Dragonborn", kind: "toggle", econ: "bonus", minLevel: 5, uses: "Draconic Flight", until: "rounds:100",
    notes: "From character level 5, once per Long Rest: spectral wings for 10 minutes (they end early if you retract them or become Incapacitated) give a Fly Speed equal to your Speed. Flight is positioning only and is not applied until zones track height." },

  // ---- Dwarf
  "Dwarven Resilience": { owner: "species:Dwarf", kind: "passive", fx: { resist: ["poison"], condAdv: ["poisoned"] },
    notes: "Resistance to Poison damage, and Advantage on saves to avoid or end the Poisoned condition." },

  "Dwarven Toughness": { owner: "species:Dwarf", combat: "none",
    notes: "Hit Point maximum +1 per character level, applied by maxHP() in src/engine_rules.js. Nothing for the combat engine to add." },

  "Stonecunning": { owner: "species:Dwarf", combat: "exploration",
    notes: "Bonus Action, on or touching stone: Tremorsense 60 feet for 10 minutes, PB uses per Long Rest (pool 'Stonecunning')." },

  // ---- Elf
  "Elven Lineage": { owner: "species:Elf", combat: "todo",
    notes: "One entry for all three lineages because the combat part is spells only. Drow: Faerie Fire at level 3 and Darkness at level 5. High Elf: Detect Magic at 3 and Misty Step at 5. Wood Elf: Longstrider at 3 and Pass without Trace at 5. Each leveled spell can be cast once per Long Rest without a slot, or with slots; SPECIES_SPELLS (data/data_innate_magic.js) lists them by level. A free-cast entry holds one spell, so the engine should give each leveled lineage spell its own free cast. Wood Elf Speed 35 and Drow Darkvision 120 are applied by the sheet." },

  "Fey Ancestry": { owner: "species:Elf", kind: "passive", fx: { condAdv: ["charmed"] },
    notes: "Advantage on saves to avoid or end the Charmed condition." },

  "Keen Senses": { owner: "species:Elf", combat: "exploration",
    notes: "Proficiency in Insight, Perception or Survival (player's choice)." },

  "Trance": { owner: "species:Elf", combat: "none",
    notes: "No sleep, immune to magic sleep, 4-hour Long Rest." },

  // ---- Gnome
  "Gnomish Cunning": { owner: "species:Gnome", kind: "passive", fx: { saveAdv: ["INT", "WIS", "CHA"] },
    notes: "Advantage on Intelligence, Wisdom and Charisma saving throws." },

  "Gnomish Lineage": { owner: "species:Gnome", combat: "exploration",
    notes: "Forest Gnome: Minor Illusion, and Speak with Animals castable PB times per Long Rest without a slot (no combat use). Rock Gnome: Mending and Prestidigitation, and Tiny clockwork devices made in 10 minutes (no combat use)." },

  // ---- Goliath
  "Giant Ancestry|Cloud's Jaunt": { owner: "species:Goliath", kind: "extra-action", econ: "bonus", uses: "Giant Ancestry",
    notes: "Teleport up to 30 feet to an unoccupied space you can see. PB uses per Long Rest. Positioning is applied when zones arrive." },
  "Giant Ancestry|Fire's Burn": { owner: "species:Goliath", kind: "on-hit", trigger: "youHit", econ: "free", uses: "Giant Ancestry",
    dmg: [{ dice: "1d10", type: "fire" }],
    notes: "When you hit with an attack roll and deal damage, deal 1d10 extra Fire damage to that target. Each use spends one of PB uses per Long Rest." },
  "Giant Ancestry|Frost's Chill": { owner: "species:Goliath", kind: "on-hit", trigger: "youHit", econ: "free", uses: "Giant Ancestry",
    dmg: [{ dice: "1d6", type: "cold" }], onHit: [{ mod: { speed: -10 }, until: "srcTurnStart" }],
    notes: "When you hit with an attack roll and deal damage, deal 1d6 extra Cold damage and reduce the target's Speed by 10 feet until the start of your next turn. Each use spends one of PB uses per Long Rest." },
  "Giant Ancestry|Hill's Tumble": { owner: "species:Goliath", kind: "on-hit", trigger: "youHit", econ: "free", uses: "Giant Ancestry",
    onHit: [{ cond: "prone", sizeMax: "Large" }],
    notes: "When you hit a Large or smaller creature with an attack roll and deal damage, give it the Prone condition (no save). Each use spends one of PB uses per Long Rest." },
  "Giant Ancestry|Stone's Endurance": { owner: "species:Goliath", kind: "reaction", econ: "reaction", trigger: "damaged", uses: "Giant Ancestry",
    effect: { reduce: "1d12+MOD_CON" },
    notes: "When you take damage, roll 1d12, add your Constitution modifier, and reduce the damage by that total. PB uses per Long Rest." },
  "Giant Ancestry|Storm's Thunder": { owner: "species:Goliath", kind: "reaction", econ: "reaction", trigger: "damaged", target: "enemy", uses: "Giant Ancestry",
    dmg: [{ dice: "1d8", type: "thunder" }],
    notes: "When you take damage from a creature within 60 feet of you, deal 1d8 Thunder damage to that creature (no save). PB uses per Long Rest." },

  "Large Form": { owner: "species:Goliath", kind: "toggle", econ: "bonus", minLevel: 5, uses: "Large Form", until: "rounds:100",
    mods: { speed: 10, checkAdv: ["STR"] },
    notes: "From character level 5, once per Long Rest, for 10 minutes (you can end it early): become Large if there is room, with Advantage on Strength checks and +10 feet of Speed. The Large size itself is not modelled." },

  "Powerful Build": { owner: "species:Goliath", kind: "special",
    notes: "Advantage on any ability check you make to end the Grappled condition (engine work: conditional check Advantage on an escape). You also count as one size larger for carrying capacity." },

  // ---- Halfling
  "Brave": { owner: "species:Halfling", kind: "passive", fx: { condAdv: ["frightened"] },
    notes: "Advantage on saves to avoid or end the Frightened condition." },

  "Halfling Nimbleness": { owner: "species:Halfling", combat: "zones",
    notes: "Move through the space of a creature that is a size larger than you, but you cannot stop there." },

  "Luck": { owner: "species:Halfling", kind: "passive", fx: { reroll1s: true },
    notes: "When you roll a 1 on the d20 of a D20 Test, reroll it and use the new roll." },

  "Naturally Stealthy": { owner: "species:Halfling", combat: "exploration",
    notes: "You can take the Hide action when only a creature at least one size larger than you obscures you." },

  // ---- Human
  "Resourceful": { owner: "species:Human", kind: "passive", fx: { heroicInspirationOnRest: true },
    notes: "Gain Heroic Inspiration whenever you finish a Long Rest." },

  "Skillful": { owner: "species:Human", combat: "none",
    notes: "One skill proficiency." },

  "Versatile": { owner: "species:Human", combat: "none",
    notes: "An extra Origin feat. Its own entry covers its combat effect." },

  // ---- Orc
  "Adrenaline Rush": { owner: "species:Orc", kind: "extra-action", econ: "bonus", target: "self", temp: "PB", uses: "Adrenaline Rush",
    notes: "Take the Dash action as a Bonus Action and gain PB temporary HP. PB uses, regained on a Short or Long Rest. The Dash is movement and waits for zones; the temporary HP apply now." },

  "Relentless Endurance": { owner: "species:Orc", kind: "passive", fx: { relentlessEndurance: true }, uses: "Relentless Endurance",
    notes: "When you are reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per Long Rest." },

  // ---- Tiefling
  "Fiendish Legacy|Abyssal": { owner: "species:Tiefling", kind: "passive", fx: { resist: ["poison"] },
    notes: "Resistance to Poison damage. Spells: Poison Spray cantrip, Ray of Sickness at level 3 and Hold Person at level 5, each leveled spell castable once per Long Rest without a slot (see Elven Lineage for the engine work)." },
  "Fiendish Legacy|Chthonic": { owner: "species:Tiefling", kind: "passive", fx: { resist: ["necrotic"] },
    notes: "Resistance to Necrotic damage. Spells: Chill Touch cantrip, False Life at level 3 and Ray of Enfeeblement at level 5, each leveled spell castable once per Long Rest without a slot (see Elven Lineage for the engine work)." },
  "Fiendish Legacy|Infernal": { owner: "species:Tiefling", kind: "passive", fx: { resist: ["fire"] },
    notes: "Resistance to Fire damage. Spells: Fire Bolt cantrip, Hellish Rebuke at level 3 and Darkness at level 5, each leveled spell castable once per Long Rest without a slot (see Elven Lineage for the engine work)." },

  "Otherworldly Presence": { owner: "species:Tiefling", combat: "social",
    notes: "The Thaumaturgy cantrip." }
});

// =========================================================================================================
// RESOURCE POOLS (limited uses that are not in RESOURCE_USES). "Breath Weapon" is a RESOURCE_USES key, so its
// recharge is in RESOURCE_REST below.
// =========================================================================================================
window.RESOURCE_POOLS = Object.assign(window.RESOURCE_POOLS || {}, {
  // ---- feats and boons
  "Luck Points":      { owner: "feat", formula: "PB", pool: true, rest: { short: "none", long: "all" } },
  "Guarded Mind":     { owner: "feat", formula: 1, rest: { short: "all", long: "all" } },
  "Bolstering Treats": { owner: "feat", formula: "PB", rest: { short: "none", long: "all" } },
  "Poison Doses":     { owner: "feat", formula: "PB", rest: { short: "none", long: "all" } },
  "Magic Initiate (Cleric)": { owner: "feat", formula: 1, rest: { short: "none", long: "all" } },
  "Magic Initiate (Druid)":  { owner: "feat", formula: 1, rest: { short: "none", long: "all" } },
  "Magic Initiate (Wizard)": { owner: "feat", formula: 1, rest: { short: "none", long: "all" } },
  "Fey-Touched":      { owner: "feat", formula: 1, rest: { short: "none", long: "all" } },
  "Shadow-Touched":   { owner: "feat", formula: 1, rest: { short: "none", long: "all" } },
  "Boon of Fate":     { owner: "epic-boon", formula: 1, rest: { short: "all", long: "all" } },
  "Boon of Recovery": { owner: "epic-boon", formula: 1, rest: { short: "none", long: "all" } },
  "Recover Vitality": { owner: "epic-boon", formula: 10, pool: true, rest: { short: "none", long: "all" } },

  // ---- species
  "Healing Hands":        { owner: "species:Aasimar", formula: 1, rest: { short: "none", long: "all" } },
  "Celestial Revelation": { owner: "species:Aasimar", formula: 1, rest: { short: "none", long: "all" } },
  "Draconic Flight":      { owner: "species:Dragonborn", formula: 1, rest: { short: "none", long: "all" } },
  "Stonecunning":         { owner: "species:Dwarf", formula: "PB", rest: { short: "none", long: "all" } },
  "Giant Ancestry":       { owner: "species:Goliath", formula: "PB", rest: { short: "none", long: "all" } },
  "Large Form":           { owner: "species:Goliath", formula: 1, rest: { short: "none", long: "all" } },
  "Adrenaline Rush":      { owner: "species:Orc", formula: "PB", rest: { short: "all", long: "all" } },
  "Relentless Endurance": { owner: "species:Orc", formula: 1, rest: { short: "none", long: "all" } }
});

// Dragonborn Breath Weapon: PB uses, back on a Long Rest only.
window.RESOURCE_REST = Object.assign(window.RESOURCE_REST || {}, {
  "Breath Weapon": { short: "none", long: "all" }
});
// Spell effects v2 for every cantrip and level 1 spell in data_spells_*.js (98 spells: 34 cantrips, 64 level 1).
// 67 are in SPELL_FX (23 cantrips, 44 level 1) and 31 are in SPELL_NONCOMBAT (11 cantrips, 20 level 1).
// Contract: docs/Combat_Schema.md sections A and E. Replaces the level 0-1 entries of data_spell_effects.js.
//
// SOURCES (2024 rules only; every number below was checked against these)
//   1. SRD 5.2.1 through the open5e v2 API (document__key=srd-2024): 82 of the 98 spells. SRD 5.2.1 spells its own names
//      "Hideous Laughter" and "Floating Disk"; the Player's Handbook (and data_spells_*.js) says "Tasha's Hideous Laughter"
//      and "Tenser's Floating Disk", and the keys below follow data_spells_*.js.
//   2. dnd2024.wikidot.com (2024 Player's Handbook text), all 98 spells. A sentence-by-sentence comparison of the SRD
//      text against the wikidot text for the 82 SRD spells found no differences beyond formatting. The 16 spells that are
//      Player's Handbook only (Blade Ward, Friends, Mind Sliver, Thorn Whip, Thunderclap, Toll the Dead, Word of
//      Radiance, Armor of Agathys, Arms of Hadar, Compelled Duel, Hail of Thorns, Tasha's Hideous Laughter, Tenser's
//      Floating Disk, Thunderous Smite, Witch Bolt, Wrathful Smite) were read from wikidot only.
//   3. Casting time, range, concentration, ritual flag and class list of every SRD spell were compared by script with
//      the open5e records; for the 16 PHB-only spells they were read off the wikidot pages. No disagreements.
//
// CONVENTIONS USED IN THIS FILE (all inside the contract's keys; the same ones as data/fx/spells_2_3.js)
//   - Durations: "rounds:10" is 1 minute. Anything of 10 minutes or longer is "fight".
//   - A spell with no top-level dmg and a repeat (Produce Flame, Ensnaring Strike): the repeat carries the damage. For a
//     cantrip, cantrip:true on the spell AND on the repeat means the repeat's dice scale with character level; `up`
//     scales repeat.dmg[0] (Ensnaring Strike). On Searing Smite `up` raises both the hit and the repeat.
//   - kind "smite": onHit riders apply to the creature just hit; a rider with its own save is gated by that save.
//   - A rider that needs a gate the contract can't state carries a `note` saying so (Compelled Duel).
//   - A debuff with no saving throw (Hex, Hunter's Mark) hangs its riders on onFail, which the engine applies without
//     a roll when the entry has no `save`. `to: "self"` puts the damage die on the caster.
//   - Bonus Action spell rule (2024): after casting a spell with a Bonus Action, the caster can't cast another spell with a
//     slot that turn, only a cantrip with a casting time of one action. All the Bonus Action entries here (smites,
//     Hex, Hunter's Mark, Healing Word, Shield of Faith, ...) rely on the engine enforcing it; the data doesn't repeat it.
//   - Spells with no useful fight effect in Phase 1 are in SPELL_NONCOMBAT, even where a clever player could use them in a
//     fight (Charm Person, Animal Friendship, Silent Image, Feather Fall, Goodberry). Categories follow function:
//     "ritual" is not used; the rituals are in the category of what they do.
//
// SIMPLIFICATIONS (each is repeated in the entry's notes)
//   - Choices made at cast time are fixed to one representative option: Command (Halt), Hex (disadvantage on Strength
//     checks), Guidance (all ability checks), Resistance (no mod), Protection from Evil and Good (all attackers), Blade
//     Ward (see below), Sorcerous Burst and Chromatic Orb (damage type is a list: the caster chooses).
//   - Blade Ward subtracts 1d4 from attack rolls against you. No such modifier exists, so it is a +2 AC stand-in (1d4
//     averages 2.5).
//   - Toll the Dead is modelled at 1d8; the 1d12 against a target that is missing Hit Points can't be expressed.
//   - Mind Sliver, Vicious Mockery, Guiding Bolt: each affects only "the next" roll; modelled for the stated window, so
//     a target that rolls several times in that window is penalised on all of them.
//   - Shocking Grasp stops Opportunity Attacks only; the stand-in is noReactions, which also blocks other reactions.
//   - Ice Knife's cold explosion (a Dexterity save for the target and each creature within 5 ft, on a hit or a miss) is
//     modelled as a save-gated rider on the hit, on the primary target only; `up` is added to the piercing die.
//   - Sleep applies Unconscious at once and gives the repeat save at the end of the target's next turn; RAW it is
//     Incapacitated first, and Unconscious only after a failed second save.
//   - Command makes the target Incapacitated with Speed 0 until the end of its next turn (the Halt option). Approach,
//     Drop, Flee and Grovel aren't modelled.
//   - Searing Smite and Ensnaring Strike deal their ongoing damage through `repeat` at the start of the caster's turn; the
//     Constitution save that ends Searing Smite and the Athletics check that frees an Ensnaring Strike victim are in notes.
//   - Chromatic Orb's leaps, Magic Missile's split across targets and Sorcerous Burst's exploding dice aren't modelled.
//   - Fog Cloud, Grease, Entangle and Expeditious Retreat were zone: true with their nearest fight effect. They now carry the
//     Phase 2 zone data (Combat_Schema F.2): Fog Cloud is kind "zone" (Heavily Obscured), Entangle and Grease add Difficult Terrain
//     (Grease also a prone hazard), and Expeditious Retreat is kind "move" with move.speed 30 for the Dash it grants. The zone: true
//     flag is dropped from all four.
//
// DATA ERRORS FOUND IN data_spells_*.js: none for levels 0-1. Errors in the old data_spell_effects.js entries that this
// file fixes: Command used an ad-hoc "skipturn" condition; Tasha's Hideous Laughter left out Prone; Mind Sliver, Chill
// Touch, Shocking Grasp, Ray of Frost, Thorn Whip, Vicious Mockery, Guiding Bolt and Thunderwave dropped their riders;
// Mage Armor used a flat base AC of 13 with no Dexterity modifier; Searing Smite and Wrathful Smite dropped their
// follow-up effects; Ray of Sickness, Arms of Hadar, Bane, Sleep, Color Spray, Entangle, Grease, Faerie Fire, Hail of
// Thorns, Ensnaring Strike, Compelled Duel, Thunderous Smite, Dissonant Whispers' reaction, Ice Knife, Longstrider and
// Heroism had no entry.

window.SPELL_FX = Object.assign(window.SPELL_FX || {}, {

  // ================================================================ CANTRIPS
  "Acid Splash": { kind: "save", target: "area", area: { shape: "sphere", size: 5 }, save: "DEX",
    dmg: [{ dice: "1d6", type: "acid" }], cantrip: true,
    notes: "Every creature in the 5-ft-radius Sphere, allies included. No damage on a success." },

  "Blade Ward": { kind: "buff", target: "self", conc: true, dur: "rounds:10", mods: { ac: 2 },
    notes: "RAW: whenever a creature makes an attack roll against you, it subtracts 1d4 from the roll. Stand-in: +2 AC (1d4 averages 2.5). Engine work: an attackersDie modifier." },

  "Chill Touch": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d10", type: "necrotic" }], cantrip: true,
    onHit: [{ mod: { noHeal: true }, until: "srcTurnEnd" }],
    notes: "Melee spell attack (the contract has no melee flag for spell attacks). The target can't regain Hit Points until the end of your next turn. 2024 has no Undead clause." },

  "Eldritch Blast": { kind: "attack", target: "enemy", atk: true, beams: true, dmg: [{ dice: "1d10", type: "force" }],
    notes: "One beam, two at level 5, three at 11, four at 17; each beam has its own attack roll and can choose its own target. Invocation riders (Agonizing Blast, Repelling Blast) are not part of the spell." },

  "Fire Bolt": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d10", type: "fire" }], cantrip: true,
    notes: "Lights an unattended flammable object it hits." },

  "Guidance": { kind: "buff", target: "creature", conc: true, dur: "rounds:10", mods: { checkDie: "1d4" },
    notes: "The caster picks one skill when casting; modelled as 1d4 on every ability check. Touch, willing creature." },

  "Mind Sliver": { kind: "save", target: "enemy", save: "INT", dmg: [{ dice: "1d6", type: "psychic" }], cantrip: true,
    onFail: [{ mod: { saveDie: "-1d4" }, until: "srcTurnEnd" }],
    notes: "RAW the target subtracts 1d4 only from the next saving throw it makes before the end of your next turn; modelled as every save in that window." },

  "Poison Spray": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d12", type: "poison" }], cantrip: true,
    notes: "2024: a ranged spell attack (the 2014 Constitution save is gone). Range 30 ft." },

  "Produce Flame": { kind: "buff", econ: "bonus", target: "self", dur: "fight", cantrip: true,
    repeat: { econ: "action", atk: true, cantrip: true, dmg: [{ dice: "1d8", type: "fire" }] },
    notes: "Bonus Action to light the flame (10 minutes, no concentration; it sheds light and ignites nothing); a Magic action to hurl it, on the turn of the cast and on every later turn, as a ranged spell attack at a target within 60 ft. cantrip:true on the repeat scales its dice (1d8, 2d8 at 5, 3d8 at 11, 4d8 at 17). The spell ends if you cast it again." },

  "Ray of Frost": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d8", type: "cold" }], cantrip: true,
    onHit: [{ mod: { speed: -10 }, until: "srcTurnStart" }],
    notes: "Speed is reduced by 10 ft until the start of your next turn." },

  "Resistance": { kind: "utility", target: "creature", conc: true, dur: "rounds:10",
    notes: "Touch, willing creature; the caster picks a damage type (acid, bludgeoning, cold, fire, lightning, necrotic, piercing, poison, radiant, slashing or thunder). Once per turn, when the creature takes damage of that type, the total is reduced by 1d4. Engine work: a damage-reduction effect keyed to one type and once per turn; no modifier fits." },

  "Sacred Flame": { kind: "save", target: "enemy", save: "DEX", dmg: [{ dice: "1d8", type: "radiant" }], cantrip: true,
    notes: "The target gets no benefit from Half Cover or Three-Quarters Cover on the save (Phase 2 cover). No damage on a success." },

  "Shillelagh": { kind: "utility", econ: "bonus", target: "self", dur: "rounds:10",
    notes: "A Club or Quarterstaff you hold uses your spellcasting ability instead of Strength for its attack and damage rolls, and its damage die becomes d8 (d10 at level 5, d12 at 11, 2d6 at 17); the damage can be Force or the weapon's type. Lasts 1 minute (no concentration); ends if cast again or if you let go of the weapon. Engine work: rewrite that weapon's attack ability and damage die; no modifier fits." },

  "Shocking Grasp": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d8", type: "lightning" }], cantrip: true,
    onHit: [{ mod: { noReactions: true }, until: "targetTurnStart", note: "RAW it only stops Opportunity Attacks." }],
    notes: "Melee spell attack. The target can't make Opportunity Attacks until the start of its next turn; noReactions is a stand-in and is stronger than RAW (it also blocks other reactions). The 2014 advantage against metal armour is gone." },

  "Sorcerous Burst": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d8", type: ["acid", "cold", "fire", "lightning", "poison", "psychic", "thunder"] }], cantrip: true,
    notes: "The caster chooses the type. Whenever a d8 of this spell rolls an 8, roll another d8 and add it; the number of added d8s per cast is at most the spellcasting modifier. Exploding dice aren't modelled." },

  "Spare the Dying": { kind: "utility", target: "ally",
    notes: "A creature within 15 ft that has 0 Hit Points and isn't dead becomes Stable (range 30 ft at level 5, 60 at 11, 120 at 17). It stays at 0 HP but stops making death saves. Engine work: a stabilise effect." },

  "Starry Wisp": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d8", type: "radiant" }], cantrip: true,
    notes: "On a hit the target sheds Dim Light in a 10-ft radius and can't benefit from the Invisible condition until the end of your next turn (Phase 2 light and vision)." },

  "Thorn Whip": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d6", type: "piercing" }], cantrip: true,
    onHit: [{ pull: 10, sizeMax: "Large" }],
    notes: "Melee spell attack at range 30 ft. A Large or smaller target can be pulled up to 10 ft closer (applied when zones arrive in Phase 2)." },

  "Thunderclap": { kind: "save", target: "area", area: { shape: "emanation", size: 5 }, save: "CON",
    dmg: [{ dice: "1d6", type: "thunder" }], cantrip: true,
    notes: "Every creature in the 5-ft Emanation around you, allies included (no choice). No damage on a success. Audible 100 ft away." },

  "Toll the Dead": { kind: "save", target: "enemy", save: "WIS", dmg: [{ dice: "1d8", type: "necrotic" }], cantrip: true,
    notes: "RAW the damage is d12 instead of d8 if the target is missing any Hit Points (one die more at levels 5, 11, 17, in either size). Modelled at d8; the engine should use d12 against a target below its maximum." },

  "True Strike": { kind: "utility", target: "enemy",
    notes: "Make one attack with the weapon used to cast it. The attack uses your spellcasting ability for the attack and damage rolls, and its damage can be Radiant or the weapon's type. From level 5 the attack deals extra Radiant damage: 1d6 at level 5, 2d6 at 11, 3d6 at 17. Engine work: a weapon attack that swaps the ability and adds scaling Radiant dice; the contract has no weapon-attack spell." },

  "Vicious Mockery": { kind: "save", target: "enemy", save: "WIS", dmg: [{ dice: "1d6", type: "psychic" }], cantrip: true,
    onFail: [{ mod: { atkDis: true }, until: "targetTurnEnd" }],
    notes: "RAW the target has Disadvantage only on the next attack roll it makes before the end of its next turn; modelled as every attack roll in that window." },

  "Word of Radiance": { kind: "save", target: "area", area: { shape: "emanation", size: 5 }, save: "CON",
    dmg: [{ dice: "1d6", type: "radiant" }], cantrip: true,
    notes: "Only creatures of your choice that you can see in the 5-ft Emanation, so allies are spared. No damage on a success." },

  // ================================================================ LEVEL 1
  "Armor of Agathys": { kind: "temphp", econ: "bonus", target: "self", temp: "5", tempUp: 5, dur: "fight",
    notes: "1 hour, no concentration. While any of these Temporary Hit Points remain, a creature that hits you with a melee attack roll takes 5 Cold damage; the spell ends when they are gone. Upcast: the Temporary Hit Points and the Cold damage both rise by 5 per slot level. The engine adds the retaliation by name; the contract has no key for it." },

  "Arms of Hadar": { kind: "save", target: "area", area: { shape: "emanation", size: 10 }, save: "STR", half: true,
    dmg: [{ dice: "2d6", type: "necrotic" }], up: "1d6",
    onFail: [{ mod: { noReactions: true }, until: "targetTurnStart" }],
    notes: "Every creature in the 10-ft Emanation, allies included. On a failure the target also can't take Reactions until the start of its next turn." },

  "Bane": { kind: "save", target: "enemy", n: 3, nUp: 1, save: "CHA", conc: true, dur: "rounds:10",
    onFail: [{ mod: { atkDie: "-1d4", saveDie: "-1d4" }, until: "conc" }],
    notes: "Each target that fails subtracts 1d4 from its attack rolls and saving throws." },

  "Bless": { kind: "buff", target: "allies", n: 3, nUp: 1, conc: true, dur: "rounds:10", mods: { atkDie: "1d4", saveDie: "1d4" } },

  "Burning Hands": { kind: "save", target: "area", area: { shape: "cone", size: 15 }, save: "DEX", half: true,
    dmg: [{ dice: "3d6", type: "fire" }], up: "1d6",
    notes: "Flammable objects in the Cone that aren't worn or carried start burning." },

  "Chromatic Orb": { kind: "attack", target: "enemy", atk: true, up: "1d8",
    dmg: [{ dice: "3d8", type: ["acid", "cold", "fire", "lightning", "poison", "thunder"] }],
    notes: "The caster chooses the type. If two or more of the d8s show the same number, the orb leaps to a different target within 30 ft of the last one (new attack roll, new damage roll); it can't leap again unless cast with a level 2+ slot, and at most as many leaps as the slot's level; a creature can be hit once per casting. Leaps aren't modelled." },

  "Color Spray": { kind: "save", target: "area", area: { shape: "cone", size: 15 }, save: "CON",
    onFail: [{ cond: "blinded", until: "srcTurnEnd" }],
    notes: "Blinded until the end of your next turn. 2024 has no Hit Point threshold." },

  "Command": { kind: "save", target: "enemy", n: 1, nUp: 1, save: "WIS",
    onFail: [{ cond: "incapacitated", until: "targetTurnEnd" }, { mod: { speedMult: 0 }, until: "targetTurnEnd" }],
    notes: "One word: Approach, Drop, Flee, Grovel or Halt. Modelled as Halt: on its next turn the target doesn't move and takes no action or Bonus Action (Incapacitated plus Speed 0; stronger than RAW, because a Halted creature can still take a Reaction and keeps concentrating). The other commands aren't modelled: Grovel would leave it Prone, Flee and Approach need positions." },

  "Compelled Duel": { kind: "save", econ: "bonus", target: "enemy", save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ mod: { atkDis: true }, until: "conc", note: "Applies only to attack rolls against creatures other than the caster." }],
    notes: "On a failed save the target has Disadvantage on attack rolls against anyone but you, and can't willingly move to a space more than 30 ft from you. The spell ends if you attack a creature other than the target, cast a spell on an enemy other than the target, an ally of yours damages the target, or you end your turn more than 30 ft from it. Engine work: attack disadvantage keyed to the attacked creature; the end conditions." },

  "Cure Wounds": { kind: "heal", target: "creature", heal: "2d8+MOD", healUp: "2d8" },

  "Dissonant Whispers": { kind: "save", target: "enemy", save: "WIS", half: true, dmg: [{ dice: "3d6", type: "psychic" }], up: "1d6",
    onFail: [{ mod: { noReactions: true }, until: "targetTurnStart" }],
    notes: "On a failure the target must immediately use its Reaction, if it has one, to move as far from you as it can by the safest route. The Reaction is modelled as spent (noReactions); the movement is not (Phase 2 zones)." },

  "Divine Favor": { kind: "buff", econ: "bonus", target: "self", dur: "rounds:10",
    mods: { dmgDie: { dice: "1d4", type: "radiant", on: "weapon" } },
    notes: "No concentration. Your weapon attacks deal an extra 1d4 Radiant damage on a hit for 1 minute." },

  "Divine Smite": { kind: "smite", econ: "bonus", dmg: [{ dice: "2d8", type: "radiant" }], up: "1d8",
    typeBonus: { types: ["Fiend", "Undead"], dice: "1d8" },
    notes: "Cast as a Bonus Action right after hitting with a melee weapon or an Unarmed Strike; the extra damage is part of that hit (doubled dice on a critical hit). +1d8 against a Fiend or Undead." },

  "Ensnaring Strike": { kind: "smite", econ: "bonus", conc: true, dur: "rounds:10", up: "1d6",
    onHit: [{ cond: "restrained", save: "STR", dc: "SPELL", until: "escape", escape: "SPELL" }],
    repeat: { auto: true, dmg: [{ dice: "1d6", type: "piercing" }] },
    notes: "Cast right after a weapon hit. The target makes a Strength save (Advantage if Large or larger, not modelled); on a failure it is Restrained and takes 1d6 Piercing damage at the start of each of its turns (modelled in `repeat`, on your turn; `up` raises it by 1d6 per slot level above 1); on a success the vines wither and the spell ends. The target, or a creature within its reach, can use an action for a Strength (Athletics) check against your spell save DC to end it. No damage on the hit itself." },

  "Entangle": { kind: "save", target: "area", area: { shape: "cube", size: 20 }, save: "STR", conc: true, dur: "rounds:10",
    onFail: [{ cond: "restrained", until: "escape", escape: "SPELL" }],
    zoneFx: { terrain: "difficult", until: "conc" },
    notes: "A 20-ft square. Each creature in it other than you saves when you cast the spell; the ground becomes Difficult Terrain (zoneFx: the zone is difficult while you concentrate). A Restrained creature uses an action for a Strength (Athletics) check against your spell save DC to break free. Creatures entering later don't save." },

  "Expeditious Retreat": { kind: "move", econ: "bonus", target: "self", conc: true, dur: "fight", move: { speed: 30 },
    notes: "Cast as a Bonus Action, which also takes the Dash action: move.speed is that Dash, set at 30 ft (a typical Speed; the real Dash equals your Speed). Until the spell ends (10 minutes) you can Dash again as a Bonus Action each turn; those later Dashes aren't modelled." },

  "Faerie Fire": { kind: "save", target: "area", area: { shape: "cube", size: 20 }, save: "DEX", conc: true, dur: "rounds:10",
    onFail: [{ mod: { attackersAdv: true }, until: "conc" }],
    notes: "Failing creatures are outlined: attack rolls against them have Advantage if the attacker can see them, they shed Dim Light in a 10-ft radius and can't benefit from the Invisible condition (Phase 2 light and vision). Allies in the Cube save too." },

  "False Life": { kind: "temphp", target: "self", temp: "2d4+4", tempUp: 5,
    notes: "2d4 + 4 Temporary Hit Points; +5 per slot level above 1. Lasts until used up (no timed duration in 2024)." },

  "Fog Cloud": { kind: "zone", target: "zone", conc: true, dur: "fight",
    zoneFx: { obscured: "heavy", until: "conc" },
    notes: "A 20-ft-radius Sphere of fog (radius +20 ft per slot level above 1; here it fills one zone) that is Heavily Obscured; creatures in it can't be seen from outside and can't see out. Lasts up to 1 hour. A strong wind such as Gust of Wind disperses it." },

  "Grease": { kind: "save", target: "area", area: { shape: "cube", size: 10 }, save: "DEX", dur: "rounds:10",
    onFail: [{ cond: "prone" }],
    zoneFx: { terrain: "difficult", hazard: { name: "Grease", on: ["enter", "end"], save: "DEX", onFail: [{ cond: "prone" }] }, until: "rounds:10" },
    notes: "Not concentration. A 10-ft square becomes slick Difficult Terrain for 1 minute. Each creature standing in it when it appears saves or falls Prone (the cast); a creature that enters or ends its turn there saves too (the zone hazard)." },

  "Guiding Bolt": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "4d6", type: "radiant" }], up: "1d6",
    onHit: [{ mod: { attackersAdv: true }, until: "srcTurnEnd" }],
    notes: "RAW only the next attack roll against the target before the end of your next turn has Advantage; modelled as every attack roll in that window." },

  "Hail of Thorns": { kind: "smite", econ: "bonus", dmg: [{ dice: "1d10", type: "piercing" }], up: "1d10", save: "DEX", half: true,
    area: { shape: "sphere", size: 5 },
    notes: "Cast right after hitting a creature with a ranged weapon. The target and each creature within 5 ft of it make a Dexterity save, taking 1d10 Piercing damage, or half on a success. Unlike the other smites the damage is a separate area effect, not part of the weapon hit. Engine work: offer it after ranged hits and roll the saves." },

  "Healing Word": { kind: "heal", econ: "bonus", target: "creature", heal: "2d4+MOD", healUp: "2d4" },

  "Hellish Rebuke": { kind: "reaction", trigger: "damaged", econ: "reaction", target: "enemy", save: "DEX", half: true,
    dmg: [{ dice: "2d10", type: "fire" }], up: "1d10",
    notes: "Reaction when a creature you can see within 60 ft damages you; that creature makes the save." },

  "Heroism": { kind: "buff", target: "allies", n: 1, nUp: 1, conc: true, dur: "rounds:10",
    mods: { condImmune: ["frightened"], tempEachTurn: "MOD" },
    notes: "Touch, willing creature: immune to Frightened (any current Frightened condition is suppressed) and gains Temporary Hit Points equal to the caster's spellcasting modifier at the start of each of its turns." },

  "Hex": { kind: "debuff", econ: "bonus", target: "enemy", conc: true, dur: "fight",
    onFail: [{ mod: { dmgDie: { dice: "1d6", type: "necrotic", on: "any", vs: "marked" } }, to: "self", until: "conc" },
             { mod: { checkDis: ["STR"] }, until: "conc" }],
    notes: "1 hour of concentration. You deal an extra 1d6 Necrotic damage whenever you hit the target with an attack roll. The target has Disadvantage on ability checks with one ability chosen at the cast (Strength is the stand-in). If the target drops to 0 Hit Points you can use a Bonus Action on a later turn to curse a new creature. Upcast: only the duration grows (4 hours at slot 2, 8 at 3-4, 24 at 5+). No saving throw." },

  "Hunter's Mark": { kind: "debuff", econ: "bonus", target: "enemy", conc: true, dur: "fight",
    onFail: [{ mod: { dmgDie: { dice: "1d6", type: "force", on: "any", vs: "marked" } }, to: "self", until: "conc" }],
    notes: "1 hour of concentration. You deal an extra 1d6 Force damage whenever you hit the marked creature with an attack roll, and have Advantage on Wisdom (Perception or Survival) checks to find it. If it drops to 0 Hit Points you can use a Bonus Action to move the mark to a new creature in range. Upcast: only the duration grows (8 hours at slot 3-4, 24 at 5+). No saving throw." },

  "Ice Knife": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "1d10", type: "piercing" }], up: "1d6",
    onHit: [{ dmg: { dice: "2d6", type: "cold" }, save: "DEX", dc: "SPELL" }],
    notes: "Ranged spell attack for 1d10 Piercing. Hit or miss, the shard then explodes: the target and every creature within 5 ft of it make a Dexterity save or take 2d6 Cold (no damage on a success). Modelled as a save-gated rider on a hit, on the primary target only; the engine should roll the burst on a miss and for creatures next to the target. Upcast: +1d6 to the Cold damage; `up` adds it to the first part here." },

  "Inflict Wounds": { kind: "save", target: "enemy", save: "CON", half: true, dmg: [{ dice: "2d10", type: "necrotic" }], up: "1d10",
    notes: "Touch." },

  "Longstrider": { kind: "buff", target: "allies", n: 1, nUp: 1, dur: "fight", mods: { speed: 10 },
    notes: "Touch. +10 ft Speed for 1 hour, no concentration." },

  "Mage Armor": { kind: "buff", target: "creature", dur: "fight", mods: { acBase: "13+MOD_DEX" },
    notes: "Touch, willing creature that isn't wearing armor; base AC 13 + Dexterity modifier for 8 hours. Ends if it dons armor." },

  "Magic Missile": { kind: "auto", target: "enemy", darts: 3, dartsUp: 1, dmg: [{ dice: "1d4+1", type: "force" }],
    notes: "Each dart hits a creature of your choice that you can see and can go to different targets. Shield cancels all of it." },

  "Protection from Evil and Good": { kind: "buff", target: "creature", conc: true, dur: "fight",
    mods: { attackersDis: true, condImmune: ["charmed", "frightened"] },
    notes: "Touch, willing creature, 10 minutes. Only against Aberrations, Celestials, Elementals, Fey, Fiends and Undead: they have Disadvantage on attack rolls against it, can't Charm, Frighten or possess it, and it has Advantage on new saves against such effects already on it. The modifiers above apply to every attacker; the engine should check the attacker's type." },

  "Ray of Sickness": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "2d8", type: "poison" }], up: "1d8",
    onHit: [{ cond: "poisoned", until: "srcTurnEnd" }],
    notes: "Poisoned until the end of your next turn." },

  "Sanctuary": { kind: "utility", econ: "bonus", target: "creature", dur: "rounds:10",
    notes: "Not concentration. A creature within 30 ft is warded for 1 minute: a creature that targets it with an attack roll or a damaging spell must first make a Wisdom save, and on a failure chooses a new target or loses the attack or spell. It doesn't protect against area effects. Ends if the warded creature makes an attack roll, casts a spell or deals damage. Engine work: redirect or cancel attacks aimed at the warded creature." },

  "Searing Smite": { kind: "smite", econ: "bonus", dur: "rounds:10", dmg: [{ dice: "1d6", type: "fire" }], up: "1d6",
    repeat: { auto: true, dmg: [{ dice: "1d6", type: "fire" }] },
    notes: "Not concentration. Cast right after a melee weapon or Unarmed Strike hit: +1d6 Fire on that hit. At the start of each of the target's turns for 1 minute it takes 1d6 Fire damage, then makes a Constitution save; on a success the spell ends (not modelled; the repeat damage continues for 10 rounds). `up` raises both the hit damage and the repeat damage by 1d6 per slot level above 1." },

  "Shield": { kind: "reaction", trigger: "hit", econ: "reaction", target: "self", mods: { ac: 5 }, until: "srcTurnStart",
    notes: "+5 AC, including against the triggering attack, until the start of your next turn. Also triggers when Magic Missile targets you, which then deals no damage to you." },

  "Shield of Faith": { kind: "buff", econ: "bonus", target: "creature", conc: true, dur: "fight", mods: { ac: 2 },
    notes: "A creature within 60 ft; 10 minutes." },

  "Sleep": { kind: "save", target: "area", area: { shape: "sphere", size: 5 }, save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "unconscious", until: "nextHit", repeat: "end" }],
    notes: "Creatures of your choice in the 5-ft-radius Sphere. RAW a failed save leaves the target Incapacitated until the end of its next turn, then it repeats the save; a second failure makes it Unconscious for the duration. Modelled as Unconscious at once with the repeat save at the end of its turns (success ends it); Unconscious is stronger than Incapacitated in the first round, and RAW there is a single repeat save. It also ends when the target takes damage (nextHit stands in) or a creature within 5 ft uses an action to shake it. Creatures that don't sleep, such as elves, and creatures immune to the Exhaustion condition automatically succeed (not tracked)." },

  "Tasha's Hideous Laughter": { kind: "save", target: "enemy", n: 1, nUp: 1, save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "incapacitated", until: "conc", repeat: "end", resaveOnDamage: true }, { cond: "prone", until: "conc" }],
    notes: "On a failure the target is Prone and Incapacitated, and can't end Prone on itself. It repeats the save at the end of each of its turns and each time it takes damage (with Advantage on the damage-triggered save, which the contract can't state); a success ends the spell. The Prone rider has no save of its own: it clears when the target stands up after the Incapacitated condition ends." },

  "Thunderous Smite": { kind: "smite", econ: "bonus", dmg: [{ dice: "2d6", type: "thunder" }], up: "1d6",
    onHit: [{ cond: "prone", save: "STR", dc: "SPELL", push: 10 }],
    notes: "Cast right after a melee weapon or Unarmed Strike hit: +2d6 Thunder. A creature must also succeed on a Strength save or be pushed 10 ft away from you and be Prone (the push is applied when zones arrive in Phase 2). Audible 300 ft away." },

  "Thunderwave": { kind: "save", target: "area", area: { shape: "cube", size: 15 }, save: "CON", half: true,
    dmg: [{ dice: "2d8", type: "thunder" }], up: "1d8",
    onFail: [{ push: 10 }],
    notes: "A 15-ft Cube that originates from you. On a failure a creature is also pushed 10 ft away (Phase 2 zones); on a success it takes half damage and isn't pushed. Allies in the Cube are affected." },

  "Witch Bolt": { kind: "attack", target: "enemy", atk: true, conc: true, dur: "rounds:10", dmg: [{ dice: "2d12", type: "lightning" }], up: "1d12",
    repeat: { econ: "bonus", auto: true, dmg: [{ dice: "1d12", type: "lightning" }] },
    notes: "On each of your later turns, a Bonus Action deals 1d12 Lightning to the target automatically, even if the first attack missed. The spell ends if the target gets out of range or has Total Cover from you. `up` raises only the initial damage." },

  "Wrathful Smite": { kind: "smite", econ: "bonus", dur: "rounds:10", dmg: [{ dice: "1d6", type: "necrotic" }], up: "1d6",
    onHit: [{ cond: "frightened", save: "WIS", dc: "SPELL", until: "rounds:10", repeat: "end" }],
    notes: "Not concentration. Cast right after a melee weapon or Unarmed Strike hit: +1d6 Necrotic. The target saves or is Frightened for 1 minute and repeats the save at the end of each of its turns, ending the spell on itself on a success." }
});

window.SPELL_NONCOMBAT = Object.assign(window.SPELL_NONCOMBAT || {}, {
  // ---------------------------------------------------------------- Cantrips
  "Dancing Lights": "utility", "Druidcraft": "utility", "Elementalism": "utility", "Friends": "social", "Light": "utility",
  "Mage Hand": "utility", "Mending": "utility", "Message": "social", "Minor Illusion": "utility", "Prestidigitation": "utility",
  "Thaumaturgy": "utility",
  // ---------------------------------------------------------------- Level 1
  "Alarm": "defense-outside-combat", "Animal Friendship": "social", "Charm Person": "social", "Comprehend Languages": "exploration",
  "Create or Destroy Water": "utility", "Detect Evil and Good": "detection", "Detect Magic": "detection",
  "Detect Poison and Disease": "detection", "Disguise Self": "social", "Feather Fall": "utility",
  "Find Familiar": "summon-outside-combat", "Goodberry": "healing-outside-combat", "Identify": "detection",
  "Illusory Script": "social", "Jump": "travel", "Purify Food and Drink": "utility", "Silent Image": "utility",
  "Speak with Animals": "exploration", "Tenser's Floating Disk": "utility", "Unseen Servant": "utility"
});
// Spell effects v2 for every level 2 and level 3 spell in data_spells_*.js (115 spells): 72 in SPELL_FX, 43 in
// SPELL_NONCOMBAT. Contract: docs/Combat_Schema.md section A. Replaces the level 2-3 entries of data_spell_effects.js.
//
// SOURCES. Rules text: dnd2024.wikidot.com (2024 Player's Handbook text, all 115 spells) and the open5e v2 API
// (document__key=srd-2024, SRD 5.2) for the 96 spells in the SRD; the SRD text was compared with the wikidot text for
// every SRD spell and agrees. 19 spells are Player's Handbook only (Arcane Vigor, Beast Sense, Cloud of Daggers, Cordon of
// Arrows, Crown of Madness, Melf's Acid Arrow, Nystul's Magic Aura, Summon Beast, Aura of Vitality, Blinding Smite,
// Conjure Barrage, Crusader's Mantle, Elemental Weapon, Feign Death, Hunger of Hadar, Leomund's Tiny Hut, Lightning Arrow,
// Summon Fey, Summon Undead); for those wikidot is the only free full text (D&D Beyond and Roll20 gate them), with a
// spot check of Cloud of Daggers and Summon Fey against aidedd.org and other reproductions.
//
// CONVENTIONS USED IN THIS FILE (all inside the contract's keys, but worth knowing)
//   - Durations: "rounds:10" = 1 minute, "rounds:100" = 10 minutes; anything longer than 10 minutes (and non-
//     concentration timed buffs of 1 hour or more) is "fight". `dur` is on spells with a timed effect.
//   - target "allies" together with `area` means the allies (and the caster) inside that area; `n` caps the number.
//   - summon.ac / summon.hp are strings with SLOT = the level of the slot used, e.g. "11+SLOT".
//   - A `repeat` with no `econ` costs no action: it happens automatically on each of the caster's later turns.
//   - A `repeat` with `heal` instead of `dmg` is a repeated heal (Aura of Vitality).
//   - kind "smite": `onHit` riders apply to the creature just hit.
//   - A negative dice string in mods.dmgDie or atkDie subtracts (Ray of Enfeeblement, like Bane).
//   - A spell with no top-level `dmg` and a `repeat` (Dragon's Breath, Flame Blade): `up` scales `repeat.dmg[0]`.
//   - `zone: true` marks spells whose RAW effect depends on where creatures stand or move after the cast (areas that
//     stay put, terrain, walls, pushes, teleports). The cast-time effect is still modelled.
//   - ZONE DATA (added with Combat_Schema F.2): 11 of the 18 zone spells here now carry `zoneFx` or `move` and lose the
//     `zone` flag. Cloud of Daggers, Moonbeam, Spike Growth, Web, Sleet Storm, Stinking Cloud and Cordon of Arrows put
//     their repeating damage or save in a zone hazard instead of an aura (`when` removed), so the hazard is the only
//     source of repeat damage; upcasting raises the cast-time damage only. Darkness, Plant Growth and Stinking Cloud are
//     kind "zone"; Misty Step is kind "move" (teleport 30). Hunger of Hadar keeps its aura and adds darkness and
//     Difficult Terrain. Still `zone: true`, because a zone doesn't express them (7): Conjure Animals (moves with
//     the caster), Flaming Sphere (rolls), Fly, Gust of Wind, Levitate, Silence (no Verbal spells) and Wind Wall.
//   - Concentration and ritual flags, levels and class lists in data_spells_*.js were checked against the sources: no
//     disagreements.
//
// SIMPLIFICATIONS
//   - Choices made at cast time are fixed to one representative option and the rest is in `notes`: Protection from Energy
//     (fire), Summon Undead (Ghostly), Summon Beast (Land), Summon Fey (Fuming/no mood effect), Find Steed (type list),
//     Bestow Curse (the +1d8 necrotic curse), Blindness/Deafness (Blinded), Enlarge/Reduce (Enlarge on a willing creature),
//     Calm Emotions (the immunity option), Dragon's Breath and Elemental Weapon (damage type is a list: caster chooses).
//   - Spells with several damage parts at different times fold them together: Hunger of Hadar (cold and acid both at the
//     end of the creature's turn), Melf's Acid Arrow (the 2d4 later damage is a rider).
//   - Upcasting that scales more than the first damage part, or that scales a modifier, is described in `notes` only:
//     Aid (+5 HP per level, given as `up`), Magic Weapon and Elemental Weapon (+2 at slot 3/5, +3 at 6/7), Melf's Acid Arrow
//     (both parts), Lightning Arrow (both parts), Bestow Curse (duration, concentration), Animate Dead.
//   - Summon spells model the main attack only; Multiattack scales with half the slot level and is described in `notes`.
//   - Spells that need a creature's gear or position (Heat Metal needs worn or held metal; Web, Cordon of Arrows,
//     Conjure Animals, Moonbeam need creatures to be in the area) assume the target is there.
//   - Spells with no useful fight effect in Phase 1 go in SPELL_NONCOMBAT even if a clever player could use them in a
//     fight (Alter Self, Enhance Ability, Major Image, Daylight, Gaseous Form, Feign Death, Rope Trick, Pass without Trace).
//
// DATA ERRORS FOUND IN data_spells_*.js (minor, left alone): Alter Self says the natural weapons "count as magic" (2024
// text doesn't); Meld into Stone gives 6d6 Force as the only expulsion damage (2024: 6d6 for partial destruction, 50 Force
// for complete destruction); Phantom Steed says it "fades a minute after taking any damage" (2024: the spell ends early if
// the steed takes any damage; it gradually fades over 1 minute when the spell ends). Errors in the old
// data_spell_effects.js entries that this file fixes: Blindness/Deafness was concentration (it isn't); Barkskin used
// a base AC of 17 instead of "AC 17 if lower"; the old entries for Hold Person, Slow and Blindness/Deafness
// used ad-hoc conditions ("slowed", "skipturn") the v2 contract replaces with real modifiers.
//
// ALLY QA FIX (tests/suites/ally.js): Calm Emotions and Crusader's Mantle had target "allies" and an area but no `n`. The engine
//   (effectSteps) only counts `n`, so with no `n` the spell reached ONE creature (an ally aura buffed a single ally and not
//   the caster). Combat_Schema A says "allies" goes with `n`. They now carry n: 4 (a full party: you and up to three allies).

window.SPELL_FX = Object.assign(window.SPELL_FX || {}, {

  // ================================================================ LEVEL 2
  "Aid": { kind: "buff", target: "allies", n: 3, mods: { maxHp: 5 }, up: 5, dur: "fight",
    notes: "Up to three creatures gain +5 current and maximum HP for 8 hours. Upcast: +5 per slot level above 2 (the engine must add `up` to mods.maxHp)." },

  "Arcane Vigor": { kind: "heal", econ: "bonus", target: "self", heal: "2d6+MOD", healUp: "1d6",
    notes: "Rolls up to two unexpended Hit Dice (d6 for Sorcerer and Wizard) and heals the total plus the spellcasting modifier; the dice are spent. Upcast: one more Hit Die per slot level above 2. The engine must spend the Hit Dice." },

  "Barkskin": { kind: "buff", econ: "bonus", target: "creature", mods: { acMin: 17 }, dur: "fight",
    notes: "Touch, willing creature; AC is 17 if it was lower. 1 hour, no concentration." },

  "Blindness/Deafness": { kind: "save", target: "enemy", n: 1, nUp: 1, save: "CON", dur: "rounds:10",
    onFail: [{ cond: "blinded", until: "rounds:10", repeat: "end" }],
    notes: "Not concentration. The caster chooses Blinded or Deafened; Blinded is modelled. Repeats the save at the end of each of its turns." },

  "Blur": { kind: "buff", target: "self", conc: true, dur: "rounds:10", mods: { attackersDis: true },
    notes: "Attackers that perceive you with Blindsight or Truesight ignore it; not tracked." },

  "Calm Emotions": { kind: "buff", target: "allies", n: 4, area: { shape: "sphere", size: 20 }, types: ["Humanoid"], conc: true, dur: "rounds:10",
    mods: { condImmune: ["charmed", "frightened"] },
    notes: "Willing Humanoids choose to fail the CHA save to get Immunity to Charmed and Frightened (existing conditions are suppressed: the engine should clear them while this lasts). The 'Indifferent' option against hostile creatures (ends when a target takes damage or sees an ally take damage) is not modelled." },

  "Cloud of Daggers": { kind: "auto", target: "area", area: { shape: "cube", size: 5 }, conc: true, dur: "rounds:10",
    dmg: [{ dice: "4d4", type: "slashing" }], up: "2d4",
    zoneFx: { hazard: { name: "Cloud of Daggers", on: ["end"], dmg: [{ dice: "4d4", type: "slashing" }] }, until: "conc" },
    notes: "No save. A creature takes the damage when the Cube appears (the cast), when it enters, and when it ends its turn there, once per turn. Zones: the hazard repeats it at the end of each turn a creature spends in the zone, at the base 4d4 (the +2d4 per slot level applies to the cast only); a creature that only passes through isn't hit. Moving the Cube with a Magic action isn't modelled." },

  "Cordon of Arrows": { kind: "zone", target: "zone", dur: "fight",
    zoneFx: { hazard: { name: "Cordon of Arrows", on: ["enter", "end"], save: "DEX", dmg: [{ dice: "2d4", type: "piercing" }] }, until: "fight" },
    notes: "8 hours, no concentration. Four pieces of ammunition planted in the ground (+2 per slot level above 2); each time a creature other than you (and creatures you designate) enters within 30 ft of them for the first time on a turn or ends its turn there, one piece strikes it (DEX save negates) and is used up. Zones: the hazard fires on entering the zone and at the end of a turn there. It doesn't use up pieces, so it can fire more than four times, and it hits allies too: cast it where the enemies will arrive." },

  "Crown of Madness": { kind: "save", target: "enemy", types: ["Humanoid"], save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "charmed", until: "conc", repeat: "end" }],
    notes: "Non-Humanoids succeed automatically. The charmed target must use its action (before moving) to make a melee attack against a creature the caster picks, if one is within reach; otherwise it acts normally. The caster must take a Magic action each turn to keep control or the spell ends. Engine work: forced attack on a chosen creature; the caster's per-turn action cost." },

  "Darkness": { kind: "zone", target: "zone", conc: true, dur: "rounds:100",
    zoneFx: { light: "dark", magicalDark: true, until: "conc" },
    notes: "15-ft sphere of magical Darkness that Darkvision can't see through; creatures that can't see in it can't see targets inside. Only Devil's Sight sees through it. Dispels light spells of level 2 or lower it overlaps. No save." },

  "Dragon's Breath": { kind: "buff", econ: "bonus", target: "creature", conc: true, dur: "rounds:10",
    area: { shape: "cone", size: 15 }, save: "DEX", half: true, up: "1d6",
    repeat: { econ: "action", save: "DEX", dmg: [{ dice: "3d6", type: ["acid", "cold", "fire", "lightning", "poison"] }] },
    notes: "Cast as a Bonus Action on a willing creature (often yourself). That creature can then take a Magic action to exhale a 15-ft Cone (DEX save, half on success), including on the turn of the cast, and again on later turns. The cast itself deals no damage. `up` scales repeat.dmg[0]. The creature that breathes uses the caster's save DC." },

  "Enlarge/Reduce": { kind: "buff", target: "creature", conc: true, dur: "rounds:10",
    mods: { saveAdv: ["STR"], checkAdv: ["STR"], dmgDie: { dice: "1d4", type: "weapon", on: "weapon" } },
    notes: "Enlarge on a willing creature: Advantage on STR checks and saves, +1d4 damage with its weapons and Unarmed Strikes, one size larger. Reduce (unwilling creature, CON save; Disadvantage on STR checks and saves; -1d4 damage, minimum 1) is not modelled." },

  "Find Steed": { kind: "summon", target: "creature", dur: "fight",
    summon: { name: "Otherworldly Steed", econ: "action", atk: "SPELL", dmg: [{ dice: "1d8+2", type: ["radiant", "psychic", "necrotic"] }], up: 1, ac: "10+SLOT", hp: "5+10*SLOT" },
    notes: "Not concentration; lasts until it drops to 0 HP or is replaced. Otherworldly Slam: 1d8 + slot level (Celestial radiant, Fey psychic, Fiend necrotic). Large, 60 ft Speed (fly 60 at slot 4+), shares your Initiative. While you ride it, it is a controlled mount and does not attack; model as acting independently. Life Bond (it heals when you heal from a level 1+ spell within 5 ft) and the type abilities (Fell Glare, Fey Step, Healing Touch, once per long rest) are not modelled." },

  "Flame Blade": { kind: "buff", econ: "bonus", target: "self", conc: true, dur: "rounds:100", up: "1d6",
    repeat: { econ: "action", atk: true, dmg: [{ dice: "3d6+MOD", type: "fire" }] },
    notes: "Cast as a Bonus Action; the melee spell attack is a Magic action and is available on the turn of the cast too, then every turn. `up` scales repeat.dmg[0]." },

  "Flaming Sphere": { kind: "save", target: "enemy", save: "DEX", half: true, dmg: [{ dice: "2d6", type: "fire" }], up: "1d6", conc: true, dur: "rounds:10", zone: true,
    repeat: { econ: "bonus", save: "DEX", dmg: [{ dice: "2d6", type: "fire" }] },
    notes: "RAW the sphere deals damage when a creature ends its turn within 5 ft of it, or when you roll it into a creature's space with a Bonus Action (it stops there for the turn). Modelled as damage on the cast turn (using the free Bonus Action) and on each later turn as a Bonus Action; creatures ending their turn next to it are not modelled." },

  "Gust of Wind": { kind: "save", target: "area", area: { shape: "line", size: 60 }, save: "STR", conc: true, dur: "rounds:10", zone: true,
    onFail: [{ push: 15 }],
    notes: "Line 60 ft long and 10 ft wide. A creature that ends its turn in the Line repeats the save; moving toward you costs double. No damage. Disperses gas and vapour, such as Stinking Cloud." },

  "Heat Metal": { kind: "auto", target: "enemy", dmg: [{ dice: "2d8", type: "fire" }], up: "1d8", conc: true, dur: "rounds:10",
    onHit: [{ mod: { atkDis: true }, until: "srcTurnStart" }],
    repeat: { econ: "bonus", auto: true, dmg: [{ dice: "2d8", type: "fire" }] },
    notes: "Needs a creature holding or wearing a manufactured metal object (metal weapon, medium or heavy metal armour). RAW the creature makes a CON save: on a failure it drops the object if it can, on a success it keeps it and has Disadvantage on attack rolls and ability checks until the start of your next turn. Modelled as Disadvantage on attacks either way. Damage is automatic." },

  "Hold Person": { kind: "save", target: "enemy", n: 1, nUp: 1, types: ["Humanoid"], save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "paralyzed", until: "conc", repeat: "end" }] },

  "Invisibility": { kind: "buff", target: "allies", n: 1, nUp: 1, conc: true, dur: "fight", until: "nextHit",
    mods: { atkAdv: true, attackersDis: true },
    notes: "The Invisible condition. Ends immediately after the target makes an attack roll, deals damage or casts a spell (the first attack still gets Advantage). It does not end when the target is hit. Attackers that can see Invisible creatures ignore the effect." },

  "Lesser Restoration": { kind: "utility", econ: "bonus", target: "creature",
    notes: "Ends one condition on the touched creature: Blinded, Deafened, Paralyzed or Poisoned. Engine work: a cleanse effect that removes a named condition." },

  "Levitate": { kind: "debuff", target: "enemy", save: "CON", conc: true, dur: "rounds:100", zone: true,
    onFail: [{ mod: { speedMult: 0 }, until: "conc" }],
    notes: "The creature rises up to 20 ft and can move only by pushing or pulling against a fixed object within reach, as if climbing; modelled as Speed 0. Out of reach of melee attackers (Phase 2). Willing allies skip the save; you can move the target up or down 20 ft with a Magic action." },

  "Magic Weapon": { kind: "buff", econ: "bonus", target: "creature", dur: "fight", mods: { atk: 1, dmgFlat: { n: 1, on: "weapon" } },
    notes: "A nonmagical weapon becomes +1 for 1 hour, no concentration. Upcast: +2 with a slot of level 3-5, +3 with level 6+ (threshold scaling the engine must apply). Ends if cast again." },

  "Melf's Acid Arrow": { kind: "attack", target: "enemy", atk: true, dmg: [{ dice: "4d4", type: "acid" }], up: "1d4",
    onHit: [{ dmg: { dice: "2d4", type: "acid" }, until: "targetTurnEnd" }],
    notes: "On a hit: 4d4 now and 2d4 at the end of the target's next turn. On a miss: half of the initial damage (4d4 halved) only. Upcast: +1d4 to both the initial and the later damage (`up` covers the initial only). Engine work: damage on a miss; delayed damage; upcast on a rider." },

  "Mind Spike": { kind: "save", target: "enemy", save: "WIS", half: true, dmg: [{ dice: "3d8", type: "psychic" }], up: "1d8", conc: true, dur: "fight",
    notes: "On a failed save you also always know where the target is (same plane), it can't hide from you, and Invisible gives it no benefit against you. Not modelled." },

  "Mirror Image": { kind: "buff", target: "self", dur: "rounds:10", mods: { images: 3 },
    notes: "Not concentration. When a creature hits you, roll a d6 per remaining duplicate; a 3 or higher on any die means a duplicate is hit and destroyed instead. Creatures that are Blinded or have Blindsight or Truesight ignore it." },

  "Misty Step": { kind: "move", econ: "bonus", target: "self", move: { teleport: 30 },
    notes: "Teleport up to 30 ft to an unoccupied space you can see: to any zone within 30 ft by path, with no Opportunity Attacks." },

  "Moonbeam": { kind: "save", target: "area", area: { shape: "cylinder", size: 5 }, save: "CON", half: true, dmg: [{ dice: "2d10", type: "radiant" }], up: "1d10", conc: true, dur: "rounds:10",
    zoneFx: { hazard: { name: "Moonbeam", on: ["end"], save: "CON", half: true, dmg: [{ dice: "2d10", type: "radiant" }] }, until: "conc" },
    notes: "A creature saves when the Cylinder appears (the cast), when it moves into its space (Magic action on later turns, up to 60 ft), when it enters and when it ends its turn there, once per turn. Zones: the hazard repeats the save at the end of each turn a creature spends in the zone, at the base 2d10 (the +1d10 per slot level applies to the cast only). Moving the beam isn't modelled. Shape-shifted creatures revert to true form and can't shape-shift while inside; not modelled." },

  "Phantasmal Force": { kind: "save", target: "enemy", save: "INT", conc: true, dur: "rounds:10",
    onFail: [{ note: "Believes the phantasm is real" }],
    repeat: { auto: true, dmg: [{ dice: "2d8", type: "psychic" }] },
    notes: "On a failed save, on each of your turns the phantasm deals 2d8 psychic damage to the target (assumed always in or within 5 ft of it), with no action from you and no further save. The target can take a Study action: Investigation check against your DC ends the spell; not modelled (engine could let an enemy spend its action on it)." },

  "Protection from Poison": { kind: "buff", target: "creature", dur: "fight", mods: { resist: ["poison"], condAdv: ["poisoned"] },
    notes: "Also ends the Poisoned condition on the target when cast (engine cleanse). Advantage on saves to avoid or end Poisoned." },

  "Ray of Enfeeblement": { kind: "save", target: "enemy", save: "CON", conc: true, dur: "rounds:10",
    onFail: [{ mod: { atkDis: true, saveDis: ["STR"], checkDis: ["STR"], dmgDie: { dice: "-1d8", type: "weapon", on: "any" } }, until: "conc", repeat: "end" }],
    onSuccess: [{ mod: { atkDis: true }, until: "srcTurnStart" }],
    notes: "RAW only Strength-based D20 Tests have Disadvantage (modelled as all attack rolls, so it is generous against Dexterity-based attackers; the engine should limit it to STR attacks if it can tell). Also subtracts 1d8 from all its damage rolls (negative dmgDie). On a success: Disadvantage on only the next attack roll it makes before the start of your next turn." },

  "Scorching Ray": { kind: "attack", target: "enemy", atk: true, rays: 3, raysUp: 1, dmg: [{ dice: "2d6", type: "fire" }],
    notes: "Rays can be split among targets." },

  "Shatter": { kind: "save", target: "area", area: { shape: "sphere", size: 10 }, save: "CON", half: true, dmg: [{ dice: "3d8", type: "thunder" }], up: "1d8",
    notes: "A Construct has Disadvantage on the save (not modelled)." },

  "Shining Smite": { kind: "smite", econ: "bonus", conc: true, dur: "rounds:10", dmg: [{ dice: "2d6", type: "radiant" }], up: "1d6",
    onHit: [{ mod: { attackersAdv: true }, until: "conc" }],
    notes: "Cast right after hitting with a melee weapon or Unarmed Strike. The target sheds light, attack rolls against it have Advantage, and it can't benefit from Invisible while you concentrate." },

  "Silence": { kind: "utility", target: "area", area: { shape: "sphere", size: 20 }, conc: true, dur: "rounds:100", zone: true,
    notes: "No save. Creatures entirely inside are Deafened and immune to thunder damage, and no spell with a Verbal component can be cast inside. Engine work: block Verbal-component spells for enemy casters inside the sphere." },

  "Spike Growth": { kind: "zone", target: "zone", conc: true, dur: "rounds:100",
    zoneFx: { terrain: "difficult", hazard: { name: "Spike Growth", on: ["enter", "start"], dmg: [{ dice: "2d4", type: "piercing" }] }, until: "conc" },
    notes: "RAW: Difficult Terrain, and 2d4 piercing for every 5 ft a creature travels inside (no save). Zones: Difficult Terrain, and 2d4 whenever a creature enters the zone or starts its turn there; this understates a long walk across it." },

  "Spiritual Weapon": { kind: "summon", econ: "bonus", conc: true, dur: "rounds:10",
    summon: { name: "Spiritual Weapon", econ: "bonus", atk: "SPELL", dmg: [{ dice: "1d8+MOD", type: "force" }], up: "1d8" },
    notes: "Immediate melee spell attack on the cast, then a Bonus Action each later turn (the weapon moves 20 ft). Concentration in 2024." },

  "Suggestion": { kind: "save", target: "enemy", save: "WIS", conc: true, dur: "fight",
    onFail: [{ cond: "incapacitated", until: "nextHit" }],
    notes: "Needs a target that can hear and understand you. Modelled as the suggestion 'stop fighting': the target stands down until you or your allies damage it (the engine should end it on any damage, not only hits). Other suggestions are not modelled." },

  "Summon Beast": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Bestial Spirit", econ: "action", atk: "SPELL", dmg: [{ dice: "1d8+6", type: "piercing" }], up: 1, ac: "11+SLOT", hp: "30+5*(SLOT-2)" },
    notes: "Rend: 1d8 + 4 + slot level piercing. Multiattack: a number of Rend attacks equal to half the slot level, round down (1 at slot 2, 2 at slot 4); the engine must scale the attack count. Land form modelled (30 HP at slot 2); Air has 20 HP and Fly 60 with Flyby; Water has 30 HP and Swim; Land and Water have Pack Tactics. Shares your Initiative, acts right after you." },

  "Warding Bond": { kind: "buff", target: "ally", dur: "fight",
    mods: { ac: 1, save: 1, resist: ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"] },
    notes: "Willing creature within 60 ft of you: +1 AC and saves, Resistance to all damage, and each time it takes damage you take the same amount. Ends if you drop to 0 HP, the two of you are more than 60 ft apart, or it is cast again. Engine work: linked damage back to the caster." },

  "Web": { kind: "save", target: "area", area: { shape: "cube", size: 20 }, save: "DEX", conc: true, dur: "fight",
    onFail: [{ cond: "restrained", until: "escape", escape: "SPELL" }],
    zoneFx: { terrain: "difficult", hazard: { name: "Web", on: ["enter", "start"], save: "DEX", onFail: [{ cond: "restrained", until: "escape", escape: "SPELL" }] }, until: "conc" },
    notes: "A restrained creature escapes with an action: Athletics check against the caster's save DC. Creatures that later enter or start their turn in the webs also save (the zone hazard); the webs are Difficult Terrain. Fire burns the webs away (2d4 fire to a creature that starts its turn in burning web): not modelled. The spell ends at the start of your next turn if the web isn't anchored." },

  // ================================================================ LEVEL 3
  "Aura of Vitality": { kind: "heal", target: "creature", heal: "2d6", conc: true, dur: "rounds:10", repeat: { auto: true, heal: "2d6" },
    notes: "30-ft Emanation. Heals one creature in it for 2d6 when cast and at the start of each of your later turns, with no action from you (a free repeat). Not an upcast spell." },

  "Beacon of Hope": { kind: "buff", target: "allies", n: 6, conc: true, dur: "rounds:10", mods: { saveAdv: ["WIS"] },
    notes: "Also Advantage on Death Saving Throws and the maximum possible HP from any healing. Engine work: death-save advantage; maximised healing." },

  "Bestow Curse": { kind: "save", target: "enemy", save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ mod: { dmgDie: { dice: "1d8", type: "necrotic", on: "any", vs: "marked" } }, to: "self", until: "conc" }],
    notes: "Touch. Models the curse that adds 1d8 necrotic whenever you hit the target with an attack roll or a spell. The other curses (Disadvantage on one ability's checks and saves; Disadvantage on its attacks against you; WIS save each turn or it must Dodge) are not modelled. Upcast: slot 4 lasts 10 minutes of concentration; slot 5+ needs no concentration (8 hours at 5-6, 24 hours at 7-8, until dispelled at 9)." },

  "Blinding Smite": { kind: "smite", econ: "bonus", dur: "rounds:10", save: "CON", dmg: [{ dice: "3d8", type: "radiant" }], up: "1d8",
    onHit: [{ cond: "blinded", until: "save", repeat: "end" }],
    notes: "Not concentration in 2024. There is no initial save: the target is Blinded, then repeats the CON save (top-level `save`) at the end of each of its turns, ending the spell on a success. Cast right after hitting with a melee weapon or Unarmed Strike." },

  "Blink": { kind: "utility", target: "self", dur: "rounds:10",
    notes: "Not concentration. At the end of each of your turns roll a d6; on 4-6 you vanish to the Ethereal Plane and return at the start of your next turn, so the creatures that act in between can't target or affect you (and you can't affect them). Engine work: a 50 percent chance, rolled each round, that the caster is untargetable between turns." },

  "Call Lightning": { kind: "save", target: "area", area: { shape: "sphere", size: 5 }, save: "DEX", half: true, dmg: [{ dice: "3d10", type: "lightning" }], up: "1d10",
    conc: true, dur: "rounds:100", repeat: { econ: "action", save: "DEX", dmg: [{ dice: "3d10", type: "lightning" }] },
    notes: "A bolt from the cloud on the cast, then a Magic action each later turn at the same or a different point. Outdoors in a storm the damage is +1d10 (not modelled). `up` also applies to repeat.dmg[0]." },

  "Conjure Animals": { kind: "aura", target: "area", area: { shape: "emanation", size: 10 }, save: "DEX", half: false, dmg: [{ dice: "3d10", type: "slashing" }], up: "1d10",
    conc: true, dur: "rounds:100", when: "turnEnd", zone: true,
    notes: "A Large pack of spectral animals. A creature you can see makes the save when the pack moves within 10 ft of it (you move it 30 ft on your turn), when it enters within 10 ft or ends its turn there; once per turn; no damage on a success. You choose which creatures are forced to save. You also have Advantage on STR saves within 5 ft of the pack (not modelled)." },

  "Conjure Barrage": { kind: "save", target: "area", area: { shape: "cone", size: 60 }, save: "DEX", half: true, dmg: [{ dice: "5d8", type: "force" }], up: "1d8",
    notes: "Creatures of your choice that you can see in the Cone." },

  "Counterspell": { kind: "reaction", trigger: "spell", target: "enemy", save: "CON",
    notes: "2024: reaction when you see a creature within 60 ft cast a spell with Verbal, Somatic or Material components. The caster makes a CON save against your spell save DC. On a failure the spell dissipates and the action, Bonus Action or Reaction used to cast it is wasted; a spell slot is not expended. On a success the spell works normally." },

  "Crusader's Mantle": { kind: "buff", target: "allies", n: 4, area: { shape: "emanation", size: 30 }, conc: true, dur: "rounds:10",
    mods: { dmgDie: { dice: "1d4", type: "radiant", on: "weapon" } },
    notes: "You and your allies in the aura deal +1d4 radiant when hitting with a weapon or an Unarmed Strike. The aura moves with you." },

  "Dispel Magic": { kind: "utility", target: "creature",
    notes: "Ends every ongoing spell of level 3 or lower on one creature, object or magical effect within 120 ft; for each spell of level 4+, a spellcasting ability check against DC 10 + that spell's level. Upcast: automatically ends spells of the slot's level or lower. Engine work: spell effects must remember their source spell and level so they can be ended." },

  "Elemental Weapon": { kind: "buff", target: "creature", conc: true, dur: "fight",
    mods: { atk: 1, dmgDie: { dice: "1d4", type: ["acid", "cold", "fire", "lightning", "thunder"], on: "weapon" } },
    notes: "A nonmagical weapon gets +1 to attack rolls and +1d4 damage of the type chosen at cast. Upcast: slot 5-6 gives +2 and 2d4, slot 7+ gives +3 and 3d4 (threshold scaling the engine must apply)." },

  "Fear": { kind: "save", target: "area", area: { shape: "cone", size: 30 }, save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "frightened", until: "conc", repeat: "end" }],
    notes: "Targets also drop whatever they hold and must Dash away from you by the safest route each turn. RAW the save repeats only when the creature ends its turn without line of sight to you; modelled as a save at the end of each of its turns (fleeing creatures soon break line of sight). Engine work: forced flight; dropping held items." },

  "Fireball": { kind: "save", target: "area", area: { shape: "sphere", size: 20 }, save: "DEX", half: true, dmg: [{ dice: "8d6", type: "fire" }], up: "1d6" },

  "Fly": { kind: "utility", target: "allies", n: 1, nUp: 1, conc: true, dur: "rounds:100", zone: true,
    notes: "Willing creature gains a Fly Speed of 60 ft and can hover for 10 minutes. Positioning only; falls if still aloft when the spell ends." },

  "Haste": { kind: "buff", target: "creature", conc: true, dur: "rounds:10",
    mods: { ac: 2, speedMult: 2, saveAdv: ["DEX"], extraAttacks: 1 },
    notes: "The extra action may be only one attack, Dash, Disengage, Hide or Utilize (modelled as one extra attack). When the spell ends the target is Incapacitated with Speed 0 until the end of its next turn; the engine must apply that lethargy." },

  "Hunger of Hadar": { kind: "aura", target: "area", area: { shape: "sphere", size: 20 }, conc: true, dur: "rounds:10", when: "turnEnd",
    save: "DEX", half: false, dmg: [{ dice: "2d6", type: "acid" }], up: "1d6",
    zoneFx: { light: "dark", magicalDark: true, terrain: "difficult", until: "conc" },
    onFail: [{ dmg: { dice: "2d6", type: "cold" } }, { cond: "blinded", until: "targetTurnEnd" }],
    onSuccess: [{ dmg: { dice: "2d6", type: "cold" } }, { cond: "blinded", until: "targetTurnEnd" }],
    notes: "RAW: a creature that starts its turn inside takes 2d6 cold (no save), and one that ends its turn inside makes a DEX save or takes 2d6 acid. Modelled together at the end of the turn: cold always (in both rider lists), acid on a failed save. Creatures fully inside are Blinded and the sphere is Difficult Terrain (zoneFx; it replaces the old speedMult 0.5, which would slow twice). Upcast: +1d6 to the cold OR the acid damage, your choice (`up` is applied to the acid). Darkness blocks all light." },

  "Hypnotic Pattern": { kind: "save", target: "area", area: { shape: "cube", size: 30 }, save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "charmed", until: "nextHit" }, { cond: "incapacitated", until: "nextHit" }, { mod: { speedMult: 0 }, until: "nextHit" }],
    notes: "Only creatures that can see the pattern. Charmed, Incapacitated and Speed 0 until the spell ends, it takes any damage, or another creature uses an action to shake it free. `nextHit` is a stand-in: the engine should end it on any damage and let an ally spend an action to end it." },

  "Lightning Arrow": { kind: "smite", econ: "bonus", dmg: [{ dice: "4d8", type: "lightning" }], up: "1d8",
    notes: "Cast right after a ranged weapon attack hits or misses. The target takes 4d8 lightning INSTEAD of the weapon's damage and effects (half damage on a miss); then every creature within 10 ft of the target makes a DEX save, taking 2d8 lightning (half on a success). Upcast: +1d8 to both. Engine work: replace the weapon damage; damage on a miss; the secondary 2d8 area (not modelled here)." },

  "Lightning Bolt": { kind: "save", target: "area", area: { shape: "line", size: 100 }, save: "DEX", half: true, dmg: [{ dice: "8d6", type: "lightning" }], up: "1d6",
    notes: "Line 100 ft long and 5 ft wide." },

  "Mass Healing Word": { kind: "heal", econ: "bonus", target: "allies", n: 6, heal: "2d4+MOD", healUp: "1d4" },

  "Plant Growth": { kind: "zone", target: "zone", dur: "fight",
    zoneFx: { terrain: "difficult", until: "fight" },
    notes: "Overgrowth: all normal plants in the sphere become thick, so each foot of movement costs 4 ft (the zone is Difficult Terrain, which costs double). No save, no concentration, and it affects every creature in the area (allies too). Cast it on the zone the enemies must cross. Only useful where there are normal plants; the 100-ft radius is one zone here." },

  "Protection from Energy": { kind: "buff", target: "creature", conc: true, dur: "fight", mods: { resist: ["fire"] },
    notes: "The caster picks one of acid, cold, fire, lightning or thunder when casting; fire is a stand-in. Engine work: a choice at cast time for mods.resist (default to the enemy's main damage type)." },

  "Revivify": { kind: "heal", target: "ally", heal: "1",
    notes: "Brings a creature that died within the last minute back with 1 HP. It works on the dead (failed three death saves or killed outright), not on a creature at 0 HP. Costs a 300 gp diamond, which the spell uses up. Engine work: a 'dead' state a party member can be revived from." },

  "Sleet Storm": { kind: "save", target: "area", area: { shape: "cylinder", size: 20 }, save: "DEX", conc: true, dur: "rounds:10",
    onFail: [{ cond: "prone" }, { note: "Loses concentration" }],
    zoneFx: { obscured: "heavy", terrain: "difficult", hazard: { name: "Sleet Storm", on: ["enter", "start"], save: "DEX", onFail: [{ cond: "prone" }, { note: "Loses concentration" }] }, until: "conc" },
    notes: "A creature saves the first time it enters on a turn and when it starts its turn there. The area is Heavily Obscured Difficult Terrain and douses flames. Engine work: a rider that breaks concentration." },

  "Slow": { kind: "save", target: "area", area: { shape: "cube", size: 40 }, n: 6, save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ mod: { ac: -2, speedMult: 0.5, noReactions: true, oneAttack: true }, until: "conc", repeat: "end" }],
    notes: "Up to six creatures of your choice in the Cube (`n` caps the area). Also -2 to Dexterity saves (no DEX-only save modifier exists, so left out), only an action or a Bonus Action each turn (not both), and a 25 percent chance a spell with a Somatic component fails." },

  "Spirit Guardians": { kind: "aura", target: "area", area: { shape: "emanation", size: 15 }, conc: true, dur: "rounds:100", save: "WIS", half: true,
    dmg: [{ dice: "3d8", type: ["radiant", "necrotic"] }], up: "1d8", when: "turnEnd", mods: { speedMult: 0.5 },
    notes: "Radiant if you are good or neutral, necrotic if evil. A creature saves when the aura enters its space, when it enters, and when it ends its turn there, once per turn. You can exclude creatures when you cast." },

  "Stinking Cloud": { kind: "zone", target: "zone", conc: true, dur: "rounds:10",
    zoneFx: { obscured: "heavy", hazard: { name: "Stinking Cloud", on: ["start"], save: "CON", onFail: [{ cond: "poisoned", until: "turnEnd" }, { cond: "incapacitated", until: "turnEnd" }] }, until: "conc" },
    notes: "A creature that starts its turn inside and fails is Poisoned until the end of that turn and can't take an action or Bonus Action (modelled as Incapacitated, which also removes its Reaction). Creatures immune to Poisoned are unaffected. Heavily Obscured. A strong wind (Gust of Wind) disperses it." },

  "Summon Fey": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Fey Spirit", econ: "action", atk: "SPELL", dmg: [{ dice: "2d6+6", type: "force" }], up: 1, ac: "12+SLOT", hp: "30+10*(SLOT-3)" },
    notes: "Fey Blade: 2d6 + 3 + slot level force. Multiattack: a number of Fey Blade attacks equal to half the slot level, round down (1 at slot 3, 2 at slot 4); the engine must scale the attack count. Bonus Action Fey Step (teleport 30 ft) plus a mood effect (Fuming: Advantage on its next attack this turn; Mirthful: WIS save or Charmed; Tricksy: 10-ft Cube of Darkness) is not modelled. Shares your Initiative, acts right after you." },

  "Summon Undead": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Undead Spirit", econ: "action", atk: "SPELL", dmg: [{ dice: "1d8+6", type: "necrotic" }], up: 1, ac: "11+SLOT", hp: "30+10*(SLOT-3)" },
    onHit: [{ cond: "frightened", until: "targetTurnEnd" }],
    notes: "Ghostly form modelled: Deathly Touch 1d8 + 3 + slot level necrotic, target Frightened until the end of its next turn (top-level onHit is the summon's rider); 30 HP, Fly 40 hover. Skeletal: 20 HP and Grave Bolt, ranged 150 ft, 2d4 + 3 + slot level necrotic. Putrid: 30 HP, Rotting Claw 1d6 + 3 + slot level slashing (target Paralyzed until the end of its next turn if Poisoned) and Festering Aura (CON save or Poisoned within 5 ft). Multiattack: attacks equal to half the slot level, round down; the engine must scale the count. Shares your Initiative." },

  "Vampiric Touch": { kind: "attack", target: "enemy", atk: true, conc: true, dur: "rounds:10", dmg: [{ dice: "3d6", type: "necrotic" }], up: "1d6",
    onHit: [{ heal: "half" }], repeat: { econ: "action", atk: true, dmg: [{ dice: "3d6", type: "necrotic" }] },
    notes: "Melee spell attack. You regain half the necrotic damage dealt, on the cast and on every repeat. `up` also applies to repeat.dmg[0]." },

  "Wind Wall": { kind: "save", target: "area", area: { shape: "line", size: 50 }, save: "STR", half: true, dmg: [{ dice: "4d8", type: "bludgeoning" }], conc: true, dur: "rounds:10", zone: true,
    notes: "Damages creatures in the wall's space when it appears (50 ft long, 15 ft high, 1 ft thick). Afterwards: ordinary arrows, bolts and thrown weapons from across the wall miss automatically; Small or smaller flyers and gases can't cross. Engine work: ranged attacks across a wall (Phase 2)." }
});

window.SPELL_NONCOMBAT = Object.assign(window.SPELL_NONCOMBAT || {}, {
  // ---------------------------------------------------------------- Level 2
  "Alter Self": "utility", "Animal Messenger": "social", "Arcane Lock": "defense-outside-combat", "Augury": "detection",
  "Beast Sense": "exploration", "Continual Flame": "utility", "Darkvision": "exploration", "Detect Thoughts": "detection",
  "Enhance Ability": "utility", "Enthrall": "social", "Find Traps": "detection", "Gentle Repose": "ritual",
  "Knock": "exploration", "Locate Animals or Plants": "detection", "Locate Object": "detection", "Magic Mouth": "social",
  "Nystul's Magic Aura": "utility", "Pass without Trace": "exploration", "Prayer of Healing": "healing-outside-combat",
  "Rope Trick": "defense-outside-combat", "See Invisibility": "detection", "Spider Climb": "exploration", "Zone of Truth": "social",
  // ---------------------------------------------------------------- Level 3
  "Animate Dead": "summon-outside-combat", "Clairvoyance": "detection", "Create Food and Water": "utility", "Daylight": "utility",
  "Feign Death": "utility", "Gaseous Form": "travel", "Glyph of Warding": "defense-outside-combat",
  "Leomund's Tiny Hut": "defense-outside-combat", "Magic Circle": "defense-outside-combat", "Major Image": "utility",
  "Meld into Stone": "exploration", "Nondetection": "defense-outside-combat", "Phantom Steed": "travel", "Remove Curse": "utility",
  "Sending": "social", "Speak with Dead": "exploration", "Speak with Plants": "exploration", "Tongues": "social",
  "Water Breathing": "exploration", "Water Walk": "travel"
});
// Combat data for every level 4 and level 5 spell in data_spells_*.js (89 spells: 41 at level 4, 48 at level 5).
// Contract: docs/Combat_Schema.md section A. Registers into window.SPELL_FX and window.SPELL_NONCOMBAT.
// 64 spells go in SPELL_FX (33 at level 4, 31 at level 5); 25 go in SPELL_NONCOMBAT.
//
// SOURCES (2024 rules only; every number below was checked against all of these)
//   1. SRD 5.2.1 through the open5e v2 API (document__key=srd-2024): 72 of the 89 spells.
//   2. dnd2024.wikidot.com spell pages (2024 Player's Handbook text): all 89 spells and all seven summon stat blocks.
//   3. The 5etools mirror of the XPHB spell and bestiary data, and its 2024 condition text: used as a third check.
//      An automated comparison of every dice expression and number across sources 2 and 3 found no differences.
//   Class lists, schools, concentration and ritual flags in data_spells_*.js were compared against the same sources.
//
// CONVENTIONS USED IN THIS FILE
//   - Duration: a 1-minute spell has dur "rounds:10". Anything of 10 minutes or longer has dur "fight" (the rest of the
//     fight), because no fight lasts 100 rounds.
//   - A spell that makes a creature Charmed, Restrained, etc. until the spell ends uses until "conc" on the rider.
//   - Ally emanations (Aura of Life, Aura of Purity, Circle of Power) use target "allies" with an area: you and every
//     ally inside. The engine converts the area to a count of allies.
//   - kind "aura": the effect applies to creatures in the area at "when" (the end or start of the affected creature's turn).
//     Where the 2024 text also makes a save when the spell appears (Cloudkill, Insect Plague, Wall of Fire, Evard's Black
//     Tentacles, Jallarzi's Storm of Radiance) the notes say so, and the engine should apply the aura once at casting.
//     Damage is the same on every application. Guardian of Faith has a 60-damage budget, kept by the engine.
//   - Summons (extra keys inside summon; the validator does not check them, the engine may ignore what it doesn't know):
//       SLOT   in summon.ac and summon.hp strings is the level of the slot used. HP_MAX is the caster's Hit Point maximum.
//       attacks  attacks per turn at the spell's base level. All the 2024 spirits make floor(slot level / 2) attacks.
//       count    number of identical creatures (Animate Objects: the caster's spellcasting modifier).
//       save, half  the summon's action forces a save instead of making an attack roll (Faithful Hound).
//       also     a list of extra per-turn actions in the shape of a repeat object (Summon Dragon's Breath Weapon).
//     summon.econ "free" means the creature acts on its own turn after yours with no cost to you.
//     Each spirit has several forms; the entry models one form and the notes list the others.
//   - repeat with no econ: an automatic follow-up on the affected creature's own turn, with no caster action
//     (Phantasmal Killer's repeated damage, Conjure Elemental's 4d8). "when" says which turn edge it uses.
//   - up on a buff (Conjure Minor Elementals) raises mods.dmgDie. up on a spell whose damage has two parts raises only
//     the first part, so Flame Strike and Jallarzi's Storm of Radiance (both parts rise) carry the sum of the rises.
//     repeat.up (Phantasmal Killer, Conjure Elemental) is the same rise applied to the repeated damage.
//   - nUp on an area spell (Confusion) stands in for a larger radius per slot level.
//   - A rider that needs an unsupported gate carries a note in the rider and the gate is described in the entry notes.
//   - SPELL_NONCOMBAT: "ritual" is used for the five spells that can be cast as a Ritual (Divination, Commune, Commune
//     with Nature, Contact Other Plane, Rary's Telepathic Bond). Other information spells use "detection".
//
// SIMPLIFICATIONS (each is repeated in the entry's notes)
//   - Control spells that remove a creature from the fight (Banishment, Otiluke's Resilient Sphere, Polymorph, Confusion,
//     Modify Memory) are modelled with the Incapacitated condition. See each entry for how closely that matches.
//   - Dominate Beast and Dominate Person apply Charmed; commanding the target is not modelled.
//   - Fire Shield models the Chill Shield (Resistance to fire); the thorn damage is not modelled.
//   - Contagion picks Constitution as the ability that gets Disadvantage, and keeps the Poisoned condition for the fight.
//   - Vitriolic Sphere's second 5d4 (the end of the target's next turn) is applied with the first hit.
//   - Greater Invisibility, Mislead: the Invisible condition is its two effects (attackers have Disadvantage, you have
//     Advantage); "can't be seen" effects aren't modelled.
//   - Circle of Power and Freedom of Movement apply to every source; the 2024 text limits them to spells and magical
//     effects, and the engine needs a magical flag to be exact.
//   - Zone spells (walls, terrain, teleports, forced movement) have zone: true and the nearest damage or condition effect.
//     ZONE DATA (added with Combat_Schema F.2): 8 of the 17 zone spells now carry `zoneFx` or `move` and lose the flag. Evard's
//     Black Tentacles, Wall of Fire, Cloudkill and Insect Plague keep their cast-time save (kind "save") and put the repeat in a
//     zone hazard instead of an aura (`when` removed), so upcasting raises the cast damage only. Control Water is kind "zone"
//     (a whirlpool hazard). Wall of Force and Wall of Stone are kind "zone" on a link with `blocks`. Dimension Door is kind
//     "move" (teleport 500). Steel Wind Strike also records move.teleport 30 but stays zone: true until the engine reads move on
//     an attack. Eight more stay zone: true: Antilife Shell, Compulsion, Conjure Elemental, Guardian of Faith, Jallarzi's Storm of
//     Radiance, Mordenkainen's Faithful Hound, Telekinesis and Tree Stride (no zoneFx key can say it; reasons are in each note).
//   - Grasping Vine's extra grapples at higher slots, Control Water's flood, wave and trench, Conjure Woodland Beings'
//     Bonus Action Disengage and Conjure Minor Elementals' Difficult Terrain are not modelled.
//
// ALLY QA FIX (tests/suites/ally.js): Aura of Life, Aura of Purity and Circle of Power had target "allies" and an area but no `n`. The engine
//   (effectSteps) only counts `n`, so with no `n` the spell reached ONE creature (an ally aura buffed a single ally and not
//   the caster). Combat_Schema A says "allies" goes with `n`. They now carry n: 4 (a full party: you and up to three allies).

window.SPELL_FX = Object.assign(window.SPELL_FX || {}, {

  // ---------------------------------------------------------------------------------------------- Level 4

  "Aura of Life": { kind: "buff", target: "allies", n: 4, area: { shape: "emanation", size: 30 }, conc: true, dur: "fight",
    mods: { resist: ["necrotic"] },
    notes: "You and your allies inside the 30-ft Emanation have Resistance to Necrotic damage, and Hit Point maximums can't be reduced (blocks maxHpReduce riders). An ally with 0 HP that starts its turn inside regains 1 HP: not modelled." },

  "Aura of Purity": { kind: "buff", target: "allies", n: 4, area: { shape: "emanation", size: 30 }, conc: true, dur: "fight",
    mods: { resist: ["poison"], condAdv: ["blinded", "charmed", "deafened", "frightened", "paralyzed", "poisoned", "stunned"] },
    notes: "Resistance to Poison, and Advantage on saves to avoid or end effects that include those conditions. It is not immunity in 2024." },

  "Banishment": { kind: "save", target: "enemy", n: 1, nUp: 1, save: "CHA", conc: true, dur: "rounds:10",
    onFail: [{ cond: "incapacitated", until: "conc" }],
    notes: "Modelled as Incapacitated while you concentrate. In the rules the target is moved to a harmless demiplane (Incapacitated there, can't be attacked or affected, returns when the spell ends). Aberrations, Celestials, Elementals, Fey and Fiends don't return if you hold it for the full minute (10 rounds): they are gone from the fight for good. The engine should treat the target as removed." },

  "Blight": { kind: "save", target: "enemy", save: "CON", half: true, dmg: [{ dice: "8d8", type: "necrotic" }], up: "1d8",
    notes: "A Plant creature automatically fails the save (2024; the 2014 disadvantage and maximum damage are gone). Withering a nonmagical plant has no fight effect." },

  "Charm Monster": { kind: "save", target: "enemy", n: 1, nUp: 1, save: "WIS", dur: "fight",
    onFail: [{ cond: "charmed", until: "nextHit" }],
    notes: "Not concentration. The target saves with Advantage if you or your allies are fighting it, which is always true in a fight. Charmed until the spell ends or you or an ally damages it (modelled as the next hit). Charmed means it can't attack or harm you; it can still attack your allies. The target is Friendly to you while charmed." },

  "Compulsion": { kind: "save", target: "area", area: { shape: "emanation", size: 30 }, save: "WIS", conc: true, dur: "rounds:10", zone: true,
    onFail: [{ cond: "charmed", until: "conc", repeat: "end" }],
    notes: "Creatures of your choice within 30 ft. While Charmed, each target must use as much movement as possible heading the way you choose (a Bonus Action each turn), then repeats the save. Charmed here means it can't attack you. The forced movement needs zones." },

  "Confusion": { kind: "save", target: "area", area: { shape: "sphere", size: 10 }, nUp: 1, save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "incapacitated", until: "conc", repeat: "end" }],
    notes: "Approximation. A confused creature can't take Bonus Actions or Reactions and rolls 1d10 each turn: 1 it only moves, 2-6 (50%) it does nothing, 7-8 it makes one melee attack on a random creature in reach, 9-10 it acts as it chooses. About 60% of its turns are lost outright and another 20% are a random melee attack, so Incapacitated slightly overstates the control. It repeats the save at the end of each of its turns. Upcasting adds 5 ft to the radius; nUp stands in for that." },

  "Conjure Minor Elementals": { kind: "buff", target: "self", conc: true, dur: "fight",
    mods: { dmgDie: { dice: "2d8", type: ["acid", "cold", "fire", "lightning"], on: "any" } }, up: "1d8",
    notes: "Any attack you make deals an extra 2d8 damage (acid, cold, fire or lightning, your choice per attack) when it hits a creature in your 15-ft Emanation. Modelled as always in the Emanation. up raises the dmgDie by 1d8 per slot level above 4. The ground in the Emanation is Difficult Terrain for your enemies: not modelled." },

  "Conjure Woodland Beings": { kind: "aura", target: "area", area: { shape: "emanation", size: 10 }, conc: true, dur: "fight",
    save: "WIS", half: true, dmg: [{ dice: "5d8", type: "force" }], up: "1d8", when: "turnEnd",
    notes: "You choose to force a WIS save whenever the Emanation enters a creature's space or a creature you can see enters it or ends its turn there; once per turn per creature. You can also Disengage as a Bonus Action: not modelled." },

  "Control Water": { kind: "zone", target: "zone", conc: true, dur: "fight",
    zoneFx: { hazard: { name: "Whirlpool", on: ["enter", "end"], save: "STR", half: true, dmg: [{ dice: "2d8", type: "bludgeoning" }] }, until: "conc" },
    notes: "Only the Whirlpool option is modelled, and only where there is water at least 50 ft square and 25 ft deep: cast it on a zone with deep water. A creature that enters the whirlpool or ends its turn there makes a STR save (2d8 Bludgeoning, half on a success). The pull of 10 ft toward the whirlpool isn't modelled. Flood, Part Water and Redirect Flow aren't modelled. The engine should hide this spell when the arena has no deep water." },

  "Death Ward": { kind: "buff", target: "creature", dur: "fight",
    mods: { deathWard: true },
    notes: "Lasts 8 hours or until it triggers. The first time the target would drop to 0 HP it drops to 1 HP instead and the spell ends. It also negates one effect that would kill the target instantly without dealing damage (such as Power Word Kill), and then ends." },

  "Dimension Door": { kind: "move", target: "self", move: { teleport: 500 },
    notes: "Teleports you up to 500 ft to a spot you can see, visualize or describe: to any zone within 500 ft by path, with no Opportunity Attacks. The willing creature within 5 ft of you who can come along isn't modelled. If you would arrive in an occupied space you take 4d6 Force damage and the teleport fails: not modelled." },

  "Dominate Beast": { kind: "save", target: "enemy", types: ["Beast"], save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "charmed", until: "conc", resaveOnDamage: true }],
    notes: "The target saves with Advantage if you or your allies are fighting it. It repeats the save whenever it takes damage, and a success ends the spell. While Charmed you command it by telepathy at no action cost, and it acts on your side: the engine needs a 'controlled by the caster' state, which Charmed alone doesn't give. You can command its Reaction by spending your own." },

  "Evard's Black Tentacles": { kind: "save", target: "area", area: { shape: "cube", size: 20 }, conc: true, dur: "rounds:10",
    save: "STR", dmg: [{ dice: "3d6", type: "bludgeoning" }],
    onFail: [{ cond: "restrained", until: "escape", escape: "SPELL" }],
    zoneFx: { terrain: "difficult", hazard: { name: "Black Tentacles", on: ["end"], save: "STR", dmg: [{ dice: "3d6", type: "bludgeoning" }], onFail: [{ cond: "restrained", until: "escape", escape: "SPELL" }] }, until: "conc" },
    notes: "A 20-ft square. Each creature saves when the spell is cast, when it enters, and when it ends its turn there (once per turn). On a failed save it takes 3d6 Bludgeoning damage and is Restrained. A Restrained creature uses its action for a STR (Athletics) check against your spell save DC to break free. No damage on a success. The ground is Difficult Terrain. Zones: the hazard repeats the save at the end of each turn a creature spends in the zone." },

  "Fire Shield": { kind: "buff", target: "self", dur: "fight",
    mods: { resist: ["fire"] },
    notes: "Models the chill shield: Resistance to Fire. The warm shield gives Resistance to Cold instead. Either way, a creature within 5 ft that hits you with a melee attack roll takes 2d8 (Cold with the chill shield, Fire with the warm shield): that thorn damage is not modelled and needs an engine rule. Not concentration; lasts 10 minutes." },

  "Fount of Moonlight": { kind: "buff", target: "self", conc: true, dur: "fight",
    mods: { resist: ["radiant"], dmgDie: { dice: "2d6", type: "radiant", on: "melee" } },
    notes: "Resistance to Radiant, and your melee attacks deal an extra 2d6 Radiant on a hit. Reaction (not modelled): right after you take damage from a creature you can see within 60 ft, it makes a CON save or is Blinded until the end of your next turn." },

  "Freedom of Movement": { kind: "buff", target: "allies", n: 1, nUp: 1, dur: "fight",
    mods: { condImmune: ["paralyzed", "restrained"] },
    notes: "Spells and other magical effects can't reduce the target's Speed or make it Paralyzed or Restrained. The mod is applied to every source; nonmagical sources (a ghoul's claws, a net) still work in the rules, so the engine needs a magical flag on the source. Difficult Terrain doesn't slow the target, it spends only 5 ft to escape a grapple or nonmagical restraint, and it gains a swim speed. Willing target; touch." },

  "Giant Insect": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Giant Insect", econ: "free", atk: "SPELL", dmg: [{ dice: "1d6+7", type: "piercing" }, { dice: "1d4", type: "poison" }], up: 1,
              attacks: 2, ac: "11+SLOT", hp: "30+10*(SLOT-4)" },
    notes: "Poison Jab (reach 10 ft): 1d6 + 3 + slot level Piercing plus 1d4 Poison. Multiattack: floor(slot level / 2) attacks. Spider form adds Web Bolt (ranged, 1d10 + 3 + slot level Bludgeoning, speed 0 until its next turn); Centipede form adds a Bonus Action Venomous Spew (CON save, Poisoned); Wasp form flies. Large Beast, speed 40, climb 40." },

  "Grasping Vine": { kind: "attack", econ: "bonus", target: "enemy", atk: true, conc: true, dur: "rounds:10",
    dmg: [{ dice: "4d8", type: "bludgeoning" }],
    onHit: [{ pull: 30 }, { cond: "grappled", sizeMax: "Huge", escape: "SPELL" }],
    repeat: { econ: "bonus", atk: true, dmg: [{ dice: "4d8", type: "bludgeoning" }] },
    notes: "Melee spell attack against a creature within 30 ft of the vine (the vine appears within 60 ft of you). The vine grapples one creature at a time and you can release it freely. Higher slots let it grapple one more creature per level: not modelled. The pull needs zones." },

  "Greater Invisibility": { kind: "buff", target: "creature", conc: true, dur: "rounds:10",
    mods: { attackersDis: true, atkAdv: true },
    notes: "The target has the Invisible condition: attack rolls against it have Disadvantage and its attack rolls have Advantage. Unlike Invisibility it doesn't end when the target attacks or casts. Creatures that can see invisible ignore both effects." },

  "Guardian of Faith": { kind: "aura", target: "area", area: { shape: "sphere", size: 10 }, dur: "fight", zone: true,
    save: "DEX", half: true, dmg: [{ dice: "20", type: "radiant" }], when: "turnStart",
    notes: "A Large invulnerable guardian placed within 30 ft. An enemy that moves within 10 ft of it for the first time on a turn, or starts its turn there, makes a DEX save and takes 20 Radiant (half on a success). It vanishes after dealing 60 damage in total (three failed saves, or more if some succeed): the engine should keep a damage counter. It only matters for enemies that come near its spot. Not concentration; lasts 8 hours." },

  "Ice Storm": { kind: "save", target: "area", area: { shape: "cylinder", size: 20 }, save: "DEX", half: true,
    dmg: [{ dice: "2d10", type: "bludgeoning" }, { dice: "4d6", type: "cold" }], up: "1d10",
    notes: "Upcasting adds 1d10 to the Bludgeoning part only. Hail makes the ground Difficult Terrain until the end of your next turn: not modelled." },

  "Mordenkainen's Faithful Hound": { kind: "summon", dur: "fight", zone: true,
    summon: { name: "Faithful Hound", econ: "free", save: "DEX", half: false, dmg: [{ dice: "4d8", type: "force" }] },
    notes: "An invisible, intangible, invulnerable hound (it can't be targeted). At the start of each of your turns it bites one enemy within 5 ft of it: DEX save or 4d8 Force damage (the 2024 hound forces a save, it makes no attack roll). You move it up to 30 ft with a Magic action on later turns. It only hits enemies that stand next to it. Not concentration; lasts 8 hours." },

  "Otiluke's Resilient Sphere": { kind: "save", target: "enemy", save: "DEX", conc: true, dur: "rounds:10",
    onFail: [{ cond: "incapacitated", until: "conc", sizeMax: "Large" }],
    notes: "Approximation. A Large or smaller creature that fails is enclosed in a sphere that nothing can pass through in either direction: it can't be harmed from outside and can't harm anything outside, but it isn't truly Incapacitated, and it can roll the sphere at half its Speed. Treat it as removed from the fight while you concentrate. Also protects an ally or object (no save for willing targets)." },

  "Phantasmal Killer": { kind: "save", target: "enemy", save: "WIS", half: true, conc: true, dur: "rounds:10",
    dmg: [{ dice: "4d10", type: "psychic" }], up: "1d10",
    onFail: [{ mod: { atkDis: true, checkDis: "all" }, until: "conc", repeat: "end" }],
    repeat: { save: "WIS", when: "targetTurnEnd", dmg: [{ dice: "4d10", type: "psychic" }], up: "1d10" },
    notes: "2024 text: on a failed save the target takes 4d10 Psychic and has Disadvantage on ability checks and attack rolls (it is not Frightened); on a success it takes half and the spell ends. At the end of each of its turns it saves again: on a failure it takes the 4d10 again, on a success the spell ends. repeat has no econ: it is automatic on the target's turn." },

  "Polymorph": { kind: "save", target: "enemy", save: "WIS", conc: true, dur: "fight",
    onFail: [{ cond: "incapacitated", until: "nextHit" }],
    notes: "Approximation. The target becomes a Beast you choose with a Challenge Rating no higher than its own, keeps its own Hit Points, and gains Temporary Hit Points equal to the Beast's. Choosing the weakest Beast (1 HP) leaves it nearly harmless, and the spell ends once the Temporary Hit Points are gone, so it is modelled as Incapacitated until the next hit. It can't speak or cast. Willing allies can be turned into a stronger Beast: not modelled." },

  "Staggering Smite": { kind: "smite", econ: "bonus", dmg: [{ dice: "4d6", type: "psychic" }], up: "1d6", save: "WIS",
    onFail: [{ cond: "stunned", until: "srcTurnEnd" }],
    notes: "Cast right after you hit with a melee weapon or an Unarmed Strike. The target takes the extra 4d6 Psychic damage (no save) and makes a WIS save or is Stunned until the end of your next turn." },

  "Stoneskin": { kind: "buff", target: "creature", conc: true, dur: "fight",
    mods: { resist: ["bludgeoning", "piercing", "slashing"] },
    notes: "One willing creature you touch. Consumes 100 GP of diamond dust." },

  "Summon Aberration": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Aberrant Spirit", econ: "free", atk: "SPELL", dmg: [{ dice: "1d10+7", type: "slashing" }], up: 1,
              attacks: 2, ac: "11+SLOT", hp: "40+10*(SLOT-4)" },
    notes: "Models the Slaad form: Claw 1d10 + 3 + slot level Slashing, and the target can't regain HP until the spirit's next turn; the Slaad also regains 5 HP at the start of its turn. Beholderkin form: Eye Ray (ranged, 150 ft) 1d8 + 3 + slot level Psychic, flies. Mind Flayer form: Psychic Slam 1d8 + 3 + slot level Psychic, and its Whispering Aura deals 2d6 Psychic (WIS save) to each creature within 5 ft at the start of its turns. Multiattack: floor(slot level / 2) attacks. Medium, Psychic immunity. Requires a 400+ GP focus." },

  "Summon Construct": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Construct Spirit", econ: "free", atk: "SPELL", dmg: [{ dice: "1d8+8", type: "bludgeoning" }], up: 1,
              attacks: 2, ac: "13+SLOT", hp: "40+15*(SLOT-4)" },
    notes: "Slam 1d8 + 4 + slot level Bludgeoning; Multiattack: floor(slot level / 2) Slams. Forms: Clay (Reaction: Slam back or move when damaged), Metal (a creature that hits it in melee takes 1d10 Fire), Stone (WIS save: creatures starting a turn within 10 ft can't make Opportunity Attacks and have half Speed). Resistant to Poison, immune to Charmed, Exhaustion, Frightened, Paralyzed, Poisoned. Requires a 400+ GP focus." },

  "Summon Elemental": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Elemental Spirit", econ: "free", atk: "SPELL", dmg: [{ dice: "1d10+8", type: ["bludgeoning", "cold", "lightning", "fire"] }], up: 1,
              attacks: 2, ac: "11+SLOT", hp: "50+10*(SLOT-4)" },
    notes: "Slam 1d10 + 4 + slot level; the damage type is Bludgeoning (Earth), Cold (Water), Lightning (Air) or Fire (Fire), chosen when you cast. Multiattack: floor(slot level / 2) Slams. Speed 40, plus burrow (Earth), fly (Air) or swim (Water). Immune to Poison, Exhaustion, Paralyzed, Petrified, Poisoned; the element adds its own resistances. Requires a 400+ GP focus." },

  "Vitriolic Sphere": { kind: "save", target: "area", area: { shape: "sphere", size: 20 }, save: "DEX", half: true,
    dmg: [{ dice: "10d4", type: "acid" }], up: "2d4",
    onFail: [{ dmg: { dice: "5d4", type: "acid" } }],
    notes: "A creature that fails takes the 5d4 Acid at the end of its next turn; the rider applies it with the first hit. A success takes half of the 10d4 only, and no 5d4." },

  "Wall of Fire": { kind: "save", target: "area", area: { shape: "line", size: 60 }, conc: true, dur: "rounds:10",
    save: "DEX", half: true, dmg: [{ dice: "5d8", type: "fire" }], up: "1d8",
    zoneFx: { hazard: { name: "Wall of Fire", on: ["enter", "end"], save: "DEX", half: true, dmg: [{ dice: "5d8", type: "fire" }] }, until: "conc" },
    notes: "A wall up to 60 ft long, 20 ft high, 1 ft thick (or a ring 20 ft across). Creatures in it make a DEX save when it appears (the cast). One side you choose deals 5d8 Fire to a creature that ends its turn within 10 ft of that side or inside the wall, or that enters the wall for the first time on a turn. The other side deals no damage. Zones: the hazard burns a creature that enters the zone or ends its turn there, at the base 5d8 (the +1d8 per slot level applies to the cast only); the damaging side isn't modelled, so it burns everyone in the zone." },

  // ---------------------------------------------------------------------------------------------- Level 5

  "Animate Objects": { kind: "summon", conc: true, dur: "rounds:10",
    summon: { name: "Animated Object", econ: "bonus", atk: "SPELL", dmg: [{ dice: "1d4+3", type: "force" }], up: "1d4",
              count: "MOD", attacks: 1, ac: "15", hp: "10" },
    notes: "Models Medium or smaller objects: up to your spellcasting modifier of them (count), each AC 15, 10 HP, Slam 1d4 + 3 Force, +1d4 per slot level above 5. A Large object counts as 2 (AC 15, 20 HP, Slam 2d6 + 3 + your modifier, +1d6 per level) and a Huge object as 3 (40 HP, Slam 2d12 + 3 + your modifier, +1d12 per level). They act on your initiative after you; you command them all with one Bonus Action, or they Dodge. When one reaches 0 HP it reverts to an object." },

  "Antilife Shell": { kind: "utility", target: "self", conc: true, dur: "fight", zone: true, notTypes: ["Construct", "Undead"],
    notes: "A 10-ft Emanation around you. Creatures other than Constructs and Undead can't pass or reach through it, so enemies without reach or ranged attacks can't melee you, and you can't melee out. Spells, ranged weapons and Reach weapons go through. The spell ends if you move so that a creature is forced through the barrier. The engine needs a rule that blocks melee attacks by type." },

  "Banishing Smite": { kind: "smite", econ: "bonus", conc: true, dur: "rounds:10", dmg: [{ dice: "5d10", type: "force" }], save: "CHA",
    onFail: [{ cond: "incapacitated", until: "conc", note: "Only if the attack leaves the target at 50 Hit Points or fewer." }],
    notes: "Cast right after you hit with a melee weapon or an Unarmed Strike: the target takes an extra 5d10 Force damage (no save). If that leaves it at 50 HP or fewer it makes a CHA save or is sent to a harmless demiplane, Incapacitated, until the spell ends (up to 1 minute of Concentration), and reappears where it stood. The 50 HP condition on the rider needs an engine gate; without it the rider would apply to any target." },

  "Bigby's Hand": { kind: "summon", conc: true, dur: "rounds:10",
    summon: { name: "Bigby's Hand", econ: "bonus", atk: "SPELL", dmg: [{ dice: "5d8", type: "force" }], up: "2d8", ac: "20", hp: "HP_MAX" },
    notes: "Clenched Fist: melee spell attack, 5d8 Force, +2d8 per slot level above 5. The hand also acts the turn you cast the spell, then as a Bonus Action on later turns; it moves 60 ft first. Its other options: Grasping Hand (DEX save or Grappled, escape DC your spell save DC; a Bonus Action crush deals 4d6 + your modifier Bludgeoning, +2d6 per level), Forceful Hand (STR save, push 5 ft + 5 x your modifier), Interposing Hand (Half Cover for you, Difficult Terrain for enemies). AC 20, HP equal to your Hit Point maximum; the spell ends if it drops to 0." },

  "Circle of Power": { kind: "buff", target: "allies", n: 4, area: { shape: "emanation", size: 30 }, conc: true, dur: "fight",
    mods: { saveAdv: "all" },
    notes: "You and your allies in the 30-ft Emanation have Advantage on saves against spells and other magical effects (the mod applies to every save; the engine should limit it to magical sources). When such a save would halve the damage on a success, a success takes no damage: not expressible in mods (needs a half-to-none rule)." },

  "Cloudkill": { kind: "save", target: "area", area: { shape: "sphere", size: 20 }, conc: true, dur: "fight",
    save: "CON", half: true, dmg: [{ dice: "5d8", type: "poison" }], up: "1d8",
    zoneFx: { obscured: "heavy", hazard: { name: "Cloudkill", on: ["end"], save: "CON", half: true, dmg: [{ dice: "5d8", type: "poison" }] }, until: "conc" },
    notes: "Heavily Obscured fog. A creature saves when the fog appears (the cast), when it moves into the creature's space, and when the creature enters or ends its turn in it (once per turn). Zones: the hazard repeats the save at the end of each turn a creature spends in the zone, at the base 5d8 (the +1d8 per slot level applies to the cast only). The fog's 10-ft drift away from you each round isn't modelled. Strong wind disperses it." },

  "Cone of Cold": { kind: "save", target: "area", area: { shape: "cone", size: 60 }, save: "CON", half: true,
    dmg: [{ dice: "8d8", type: "cold" }], up: "1d8",
    notes: "A creature killed by it becomes a frozen statue until it thaws." },

  "Conjure Elemental": { kind: "aura", target: "enemy", n: 1, conc: true, dur: "fight", zone: true, when: "turnStart",
    save: "DEX", dmg: [{ dice: "8d8", type: ["lightning", "thunder", "fire", "cold"] }], up: "1d8",
    onFail: [{ cond: "restrained", until: "save", repeat: "start" }],
    repeat: { save: "DEX", when: "targetTurnStart", dmg: [{ dice: "4d8", type: ["lightning", "thunder", "fire", "cold"] }], up: "1d8" },
    notes: "A Large intangible spirit, placed within 60 ft; damage type by element: Air Lightning, Earth Thunder, Fire Fire, Water Cold. When a creature you can see enters its space or starts its turn within 5 ft, and the spirit has no creature Restrained, you can force a DEX save: on a failure 8d8 and Restrained. The Restrained creature saves again at the start of each of its turns: 4d8 on a failure, freed on a success. No damage on a success the first time. One creature at a time. Upcasting adds 1d8 to the 8d8 and 1d8 to the 4d8 (repeat.up). repeat has no econ: it is automatic on the creature's turn." },

  "Conjure Volley": { kind: "save", target: "area", area: { shape: "cylinder", size: 40 }, save: "DEX", half: true,
    dmg: [{ dice: "8d8", type: "force" }],
    notes: "A cylinder 40 ft in radius and 20 ft high, up to 150 ft away. Creatures of your choice that you can see in it save, so you can leave allies out. Force damage in 2024 (the weapon's damage type no longer applies)." },

  "Contagion": { kind: "save", target: "enemy", save: "CON", dmg: [{ dice: "11d8", type: "necrotic" }],
    onFail: [{ cond: "poisoned", until: "fight" }, { mod: { saveDis: ["CON"] }, until: "fight" }],
    notes: "Touch; the 2024 spell uses a save, not an attack roll. No damage on a success. You choose the ability that gets Disadvantage on saves while Poisoned: Constitution is modelled. The target saves at the end of each of its turns; three successes end it and three failures make it last 7 days. Modelled as lasting the fight, since it takes at least three turns to shake off." },

  "Destructive Wave": { kind: "save", target: "area", area: { shape: "emanation", size: 30 }, save: "CON", half: true,
    dmg: [{ dice: "5d6", type: "thunder" }, { dice: "5d6", type: ["radiant", "necrotic"] }],
    onFail: [{ cond: "prone" }],
    notes: "Creatures you choose in the 30-ft Emanation. On a failure: 5d6 Thunder plus 5d6 Radiant or Necrotic (your choice) and Prone; on a success half damage and not Prone." },

  "Dispel Evil and Good": { kind: "buff", target: "self", conc: true, dur: "rounds:10",
    mods: { attackersDis: true }, types: ["Celestial", "Elemental", "Fey", "Fiend", "Undead"],
    notes: "Attack rolls against you have Disadvantage when the attacker is one of the listed types (types here names the attackers, not the targets). Two ways to end the spell early: Break Enchantment (a Magic action touch ends possession, Charmed and Frightened from those types) and Dismissal (a Magic action; a creature of those types within 5 ft makes a CHA save or is sent to its home plane). Neither is modelled." },

  "Dominate Person": { kind: "save", target: "enemy", types: ["Humanoid"], save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "charmed", until: "conc", resaveOnDamage: true }],
    notes: "The target saves with Advantage if you or your allies are fighting it. It repeats the save whenever it takes damage, and a success ends the spell. While Charmed you command it by telepathy at no action cost, and it acts on your side: the engine needs a 'controlled by the caster' state, which Charmed alone doesn't give. You can command its Reaction by spending your own." },

  "Flame Strike": { kind: "save", target: "area", area: { shape: "cylinder", size: 10 }, save: "DEX", half: true,
    dmg: [{ dice: "5d6", type: "fire" }, { dice: "5d6", type: "radiant" }], up: "2d6",
    notes: "Upcasting adds 1d6 Fire and 1d6 Radiant per slot level above 5. up is 2d6, which the engine adds to the Fire part; the true split is half each." },

  "Greater Restoration": { kind: "utility", target: "creature",
    notes: "Touch. Ends one of: the Charmed or Petrified condition, a curse, an ability score reduction, a Hit Point maximum reduction, or one Exhaustion level. In a fight the useful cases are ending Charmed or Petrified on an ally and restoring a reduced Hit Point maximum (Wights, Wraiths). The engine needs a 'cure' effect that removes a named condition. Consumes 100 GP of diamond dust." },

  "Hold Monster": { kind: "save", target: "enemy", n: 1, nUp: 1, save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "paralyzed", until: "conc", repeat: "end" }],
    notes: "Works on any creature type. The target repeats the save at the end of each of its turns." },

  "Insect Plague": { kind: "save", target: "area", area: { shape: "sphere", size: 20 }, conc: true, dur: "fight",
    save: "CON", half: true, dmg: [{ dice: "4d10", type: "piercing" }], up: "1d10",
    zoneFx: { obscured: "light", terrain: "difficult", hazard: { name: "Insect Plague", on: ["end"], save: "CON", half: true, dmg: [{ dice: "4d10", type: "piercing" }] }, until: "conc" },
    notes: "A creature saves when the swarm appears (the cast), when it enters the sphere for the first time on a turn, and when it ends its turn there (once per turn). The area is Lightly Obscured Difficult Terrain. Zones: the hazard repeats the save at the end of each turn a creature spends in the zone, at the base 4d10 (the +1d10 per slot level applies to the cast only)." },

  "Jallarzi's Storm of Radiance": { kind: "aura", target: "area", area: { shape: "cylinder", size: 10 }, conc: true, dur: "rounds:10", zone: true,
    save: "CON", half: true, dmg: [{ dice: "2d10", type: "radiant" }, { dice: "2d10", type: "thunder" }], up: "2d10", when: "turnEnd",
    onFail: [{ cond: "blinded", until: "conc" }, { cond: "deafened", until: "conc" }],
    onSuccess: [{ cond: "blinded", until: "conc" }, { cond: "deafened", until: "conc" }],
    notes: "A 10-ft-radius, 40-ft-high cylinder. Creatures in it are Blinded and Deafened (whatever the save) and can't cast spells with a Verbal component; the conditions last only while they stay inside. A creature saves when the storm appears, when it enters for the first time on a turn, and when it ends its turn there (once per turn). Upcasting adds 1d10 Radiant and 1d10 Thunder; up is 2d10 on the first part." },

  "Mass Cure Wounds": { kind: "heal", target: "allies", n: 6, heal: "5d8+MOD", healUp: "1d8",
    notes: "Up to six creatures in a 30-ft-radius Sphere around a point within 60 ft." },

  "Mislead": { kind: "buff", target: "self", conc: true, dur: "fight", until: "nextHit",
    mods: { attackersDis: true, atkAdv: true },
    notes: "You gain the Invisible condition and an illusory double appears where you stand. The invisibility ends right after you make an attack roll, deal damage or cast a spell (so until: nextHit means your next attack roll, whether it hits or not). The first attack still benefits. The double can't be hurt; you can move and speak through it with a Magic action: not modelled." },

  "Modify Memory": { kind: "save", target: "enemy", save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "charmed", until: "nextHit" }, { cond: "incapacitated", until: "nextHit" }],
    notes: "The target saves with Advantage if you are fighting it. On a failure it is Charmed and Incapacitated and unaware of its surroundings. Taking any damage, or being targeted by another spell, ends it and no memory changes. As a fight tool it is a one-target disable until damaged; the memory rewrite is not modelled." },

  "Steel Wind Strike": { kind: "attack", target: "enemy", n: 5, atk: true, zone: true, move: { teleport: 30 }, dmg: [{ dice: "6d10", type: "force" }],
    notes: "A melee spell attack against each of up to five creatures you can see within 30 ft. Afterward you teleport to an unoccupied space you can see within 5 ft of one target: move.teleport records it: the engine should move you to the zone of one target after the attacks. It does not yet read move on an attack, so zone stays true." },

  "Summon Celestial": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Celestial Spirit", econ: "free", atk: "SPELL", dmg: [{ dice: "2d6+7", type: "radiant" }], up: 1,
              attacks: 2, ac: "11+SLOT", hp: "40+10*(SLOT-5)" },
    notes: "Models the Avenger: Radiant Bow (ranged, 600 ft) 2d6 + 2 + slot level Radiant. The Defender (AC +2) swings a Radiant Mace for 1d10 + 3 + slot level Radiant and gives the spirit, or a creature within 10 ft of the target, 1d10 Temporary Hit Points. Both forms have Healing Touch once a day: 2d8 + slot level HP to another creature. Multiattack: floor(slot level / 2) attacks. Large, flies 40, Resistant to Radiant, immune to Charmed and Frightened. Requires a 500+ GP focus." },

  "Summon Dragon": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Draconic Spirit", econ: "free", atk: "SPELL", dmg: [{ dice: "1d6+9", type: "piercing" }], up: 1,
              attacks: 2, ac: "14+SLOT", hp: "50+10*(SLOT-5)",
              also: [{ name: "Breath Weapon", save: "DEX", half: true, area: { shape: "cone", size: 30 },
                       dmg: [{ dice: "2d6", type: ["acid", "cold", "fire", "lightning", "poison"] }] }] },
    notes: "Each turn: floor(slot level / 2) Rend attacks (reach 10 ft, 1d6 + 4 + slot level Piercing) and a Breath Weapon (30-ft Cone, DEX save, 2d6 of the type you choose when you cast it, half on a success; the damage doesn't rise with the slot). You also gain Resistance to the damage type chosen. Large, fly 60, swim 30; resistant to acid, cold, fire, lightning, poison; immune to Charmed, Frightened, Poisoned. Requires a 500+ GP focus." },

  "Swift Quiver": { kind: "utility", econ: "bonus", target: "self", conc: true, dur: "rounds:10",
    notes: "When you cast it, and as a Bonus Action on each later turn, you make two attacks with a weapon that fires Arrows or Bolts. They use the weapon's own attack bonus and damage (the magic ammunition deals normal nonmagical damage). The engine needs a spell effect that grants weapon attacks, like Flurry of Blows." },

  "Synaptic Static": { kind: "save", target: "area", area: { shape: "sphere", size: 20 }, save: "INT", half: true,
    dmg: [{ dice: "8d6", type: "psychic" }],
    onFail: [{ mod: { atkDie: "-1d6", checkDie: "-1d6" }, until: "rounds:10", repeat: "end" }],
    notes: "On a failure the target also subtracts 1d6 from its attack rolls, ability checks and Constitution saves to maintain Concentration for 1 minute. The Concentration part is not modelled (no concentration-only die). The target repeats the INT save at the end of each of its turns, ending it on a success." },

  "Telekinesis": { kind: "save", target: "enemy", save: "STR", conc: true, dur: "fight", zone: true,
    onFail: [{ cond: "restrained", until: "srcTurnEnd", sizeMax: "Huge" }],
    repeat: { econ: "action", save: "STR" },
    notes: "Creature option: a Huge or smaller creature that fails is moved up to 30 ft in any direction within range and is Restrained until the end of your next turn (suspended in the air if lifted; it falls at the end of your next turn unless you repeat the option and it fails). You use a Magic action each turn to repeat it on the same or a new creature. The movement and falling need zones. The Object option isn't a fight effect." },

  "Tree Stride": { kind: "utility", target: "self", conc: true, dur: "rounds:10", zone: true,
    notes: "Once per turn you spend 5 ft of movement to enter a living tree and come out of another tree of the same kind within 500 ft, using another 5 ft. Both trees must be at least your size, and you must end each turn outside a tree. Mobility only; needs zones and trees." },

  "Wall of Force": { kind: "zone", target: "link", conc: true, dur: "fight",
    zoneFx: { blocks: true, until: "conc" },
    notes: "An invisible wall: ten 10x10-ft panels, or a dome or sphere up to 10 ft in radius. Nothing passes it, it is immune to all damage and Dispel Magic, and only Disintegrate destroys it. Zones: it closes the link you choose, so nobody can cross it or see across it. A sphere or dome around enemies traps them (no save) until you stop concentrating: not modelled. It also blocks Ethereal travel." },

  "Wall of Stone": { kind: "zone", target: "link", conc: true, dur: "fight",
    zoneFx: { blocks: true, until: "conc" },
    notes: "A nonmagical stone wall: ten 10x10-ft panels (6 in thick, AC 15, 30 HP per inch of thickness, immune to Poison and Psychic). Zones: it closes the link you choose, so nobody can cross it or see across it, until you stop concentrating (the wall's AC and HP, and the permanent wall after 10 minutes of concentration, aren't modelled). A creature that would be enclosed makes a DEX save and moves out with its Reaction on a success: not modelled." },

  "Yolande's Regal Presence": { kind: "aura", target: "area", area: { shape: "emanation", size: 10 }, conc: true, dur: "rounds:10",
    save: "WIS", half: true, dmg: [{ dice: "4d6", type: "psychic" }], when: "turnEnd",
    onFail: [{ cond: "prone" }, { push: 10 }],
    notes: "You can force the save when the Emanation enters a creature's space or a creature you can see enters it or ends its turn there (once per turn per creature). A failure: 4d6 Psychic, Prone, and you can push it up to 10 ft away. A success: half damage only. The push needs zones." }
});

window.SPELL_NONCOMBAT = Object.assign(window.SPELL_NONCOMBAT || {}, {
  // Level 4
  "Arcane Eye": "exploration",
  "Divination": "ritual",
  "Fabricate": "utility",
  "Hallucinatory Terrain": "utility",
  "Leomund's Secret Chest": "utility",
  "Locate Creature": "detection",
  "Mordenkainen's Private Sanctum": "defense-outside-combat",
  "Stone Shape": "utility",
  // Level 5
  "Awaken": "summon-outside-combat",
  "Commune": "ritual",
  "Commune with Nature": "ritual",
  "Contact Other Plane": "ritual",
  "Creation": "utility",
  "Dream": "social",
  "Geas": "social",
  "Hallow": "defense-outside-combat",
  "Legend Lore": "detection",
  "Passwall": "exploration",
  "Planar Binding": "summon-outside-combat",
  "Raise Dead": "healing-outside-combat",
  "Rary's Telepathic Bond": "ritual",
  "Reincarnate": "healing-outside-combat",
  "Scrying": "detection",
  "Seeming": "social",
  "Teleportation Circle": "travel"
});
// Combat data for every level 6 and level 7 spell in data_spells_*.js (55 spells: 34 at level 6, 21 at level 7).
// Contract: docs/Combat_Schema.md sections 0, A, E and F.2. Registers into window.SPELL_FX and window.SPELL_NONCOMBAT.
// 28 spells go in SPELL_FX (18 at level 6, 10 at level 7); 27 go in SPELL_NONCOMBAT (16 at level 6, 11 at level 7).
//
// SOURCES (2024 rules only)
//   1. SRD 5.2.1 through the open5e v2 API (document__key=srd-2024): 51 of the 55 spells. The SRD uses the short names
//      for some (Arcane Sword for Mordenkainen's Sword, Freezing Sphere for Otiluke's Freezing Sphere, Irresistible
//      Dance for Otto's Irresistible Dance, Instant Summons, Magnificent Mansion); the data files use the Player's
//      Handbook names and so does this file.
//   2. dnd2024.wikidot.com spell pages (2024 Player's Handbook text) for the spells the SRD omits (Arcane Gate, Summon
//      Fiend, Power Word Fortify) and for the upcast lines the open5e text drops (Chain Lightning's extra bolt per slot
//      level above 6 is in the Player's Handbook text). Tasha's Bubbling Cauldron is in neither source; it is classified
//      from the description in data_spells_4.js alone.
//   The Summon Fiend stat block (Fiendish Spirit) was read from the wikidot page.
//
// CONVENTIONS USED IN THIS FILE
//   - Duration: a 1-minute spell has dur "rounds:10". Anything of 10 minutes or longer has dur "fight" (the rest of the
//     fight), because no fight lasts 100 rounds. Same as spells_4_5.js.
//   - Casting time decides the file. A spell with a casting time longer than one action cannot be cast in a fight, so it
//     goes in SPELL_NONCOMBAT even when its effect would help in one (Heroes' Feast, Regenerate, Symbol, Contingency,
//     Guards and Wards). Same policy as spells_2_3.js (Magic Circle, Leomund's Tiny Hut).
//   - SPELL_NONCOMBAT: "ritual" is used for the two spells with the Ritual flag in the data (Drawmij's Instant Summons,
//     Forbiddance). Teleports that travel between places (Teleport, Word of Recall, Plane Shift, Etherealness) are
//     "travel".
//   - Walls and lingering areas follow F.2: the immediate save and damage stay on the spell, and zoneFx carries the
//     lasting part (a hazard for a wall that hurts those who cross it, terrain, cover, blocks). A wall that can be
//     crossed (Blade Barrier, Wall of Thorns) is zoneFx on target "area"; a wall that cannot be crossed (Wall of Ice,
//     Prismatic Wall) is target "link" with blocks: true.
//   - Summons: no summon.attacks on Summon Fiend, so the 2024 default applies (one attack per two slot levels, taken from
//     the slot used). summon.ac and summon.hp use SLOT, the level of the slot used. The damage dice include the fixed
//     part at the spell's base level (3 + 6 = 9) and "up: 1" adds one per slot level above it.
//   - A debuff with no save key puts its onFail riders on the target with no save. It is used for the spells that work
//     with no saving throw (Forcecage).
//   - repeat with no econ is an automatic follow-up on the affected creature's own turn (Weird, like Phantasmal Killer).
//     repeat with econ is a follow-up the caster makes on later turns (Conjure Fey, Mordenkainen's Sword, Sunbeam). A
//     rider (onHit, onFail) inside a repeat is the rider that follow-up carries; the validator does not check it.
//
// SIMPLIFICATIONS (each is repeated in the entry's notes)
//   - Spells that remove a creature from the fight (Flesh to Stone, Forcecage) are modelled with a condition that is the
//     nearest match: Flesh to Stone is Restrained for the whole spell (the real spell frees the target after three
//     successful saves and petrifies it after three failed ones, which the vocabulary cannot count); Forcecage is
//     Incapacitated, standing for a creature sealed in a solid box.
//   - Mass Suggestion is modelled as Charmed and Incapacitated until the target takes damage ("stop fighting"), the same
//     reading as Suggestion in spells_2_3.js.
//   - Delayed Blast Fireball is resolved when it is cast, at its base 12d6. The extra 1d6 per turn spent waiting is in the
//     notes.
//   - Divine Word applies the banishment of Celestials, Elementals, Fey and Fiends. Its effects by remaining Hit Points
//     (dies at 20 or fewer, Stunned at 30 or fewer, Blinded and Deafened at 40 or fewer, Deafened at 50 or fewer) need a
//     current-HP gate on riders, which the vocabulary does not have, so they are a rider note only.
//   - Prismatic Spray always uses a damage ray. Three of the eight rays are not plain damage (Indigo, Violet, and the
//     double ray), so the real spell does less damage and more control than this entry.
//   - Reverse Gravity deals its fall damage (10d6) when cast instead of when the spell ends or the creature strikes a
//     ceiling, and the creature is Restrained while it hovers.
//   - Conjure Celestial models Searing Light (the damage option). Healing Light (4d12 + spellcasting modifier) is in the
//     notes only, because an aura here only hurts enemies.
//   - Power Word Fortify's 120 Temporary Hit Points are split evenly across four creatures (30 each). Fortify can reach
//     six creatures and the split is the caster's choice.
//   - Power Word Fortify, Heal and similar single-value spells use plain numbers as dice ("70", "30").
//   - Extras that are not a fight effect are left to the notes: Disintegrate's dust, the Zombie Finger of Death raises,
//     objects set alight by Fire Storm, the ice Freezing Sphere leaves on water.
//   - Arcane Gate is a "move" with teleport 500 for the caster. The portal also lets allies and enemies cross using
//     movement, and the second portal must be within 10 ft of the caster; none of that is modelled.
//   - Mirage Arcane, Programmed Illusion and similar illusions of terrain or scenes are noncombat.
//
// DATA ERRORS FOUND IN data_spells_4.js (minor, left alone): Plane Shift's description lists a way to banish an unwilling
// creature (2014 rule; the 2024 spell only moves you and up to eight willing creatures); Heroes' Feast describes the 2014
// benefits (cures disease and poison, Advantage on WIS saves; the 2024 feast gives Resistance to Poison, Immunity to
// Frightened and Poisoned, and 2d10 maximum Hit Points); Wind Walk says Resistance to nonmagical weapon damage (2024:
// Resistance to Bludgeoning, Piercing and Slashing); Harm says the Hit Point maximum is reduced "minimum 1" (2024: it can't
// be reduced below 1, so the same).

window.SPELL_FX = Object.assign(window.SPELL_FX || {}, {

  // ---------------------------------------------------------------------------------------------- Level 6

  "Arcane Gate": { kind: "move", target: "self", conc: true, dur: "fight", zone: true, move: { teleport: 500 },
    notes: "Two Large circular portals: one within 500 ft of you that you can see, the other within 10 ft of you. Anything that enters the open side of one leaves by the open side of the other. Modelled as the caster teleporting up to 500 ft (a step through the portal). Allies and enemies can also cross using movement, and you can change which way the open sides face as a Bonus Action: not modelled. Needs zones." },

  "Blade Barrier": { kind: "save", target: "area", area: { shape: "line", size: 100 }, save: "DEX", half: true, dmg: [{ dice: "6d10", type: "force" }],
    conc: true, dur: "fight", zone: true,
    zoneFx: { terrain: "difficult", cover: "three-quarters",
      hazard: { name: "Blade Barrier", on: ["enter", "end"], save: "DEX", dmg: [{ dice: "6d10", type: "force" }], half: true }, until: "conc" },
    notes: "A straight wall up to 100 ft long, 20 ft high and 5 ft thick, or a ring up to 60 ft across. Its space gives Three-Quarters Cover and is Difficult Terrain. A creature in the wall's space when it appears, or that enters it or ends its turn there, makes a DEX save: 6d10 Force, half on a success, once per turn. The hazard is the lasting part; the save and damage on the spell are the cast-time hit on creatures already in the wall." },

  "Chain Lightning": { kind: "save", target: "enemy", n: 4, nUp: 1, save: "DEX", half: true, dmg: [{ dice: "10d8", type: "lightning" }],
    notes: "One bolt hits a target within range, then three bolts leap to up to three other targets of your choice within 30 ft of the first. Each target is hit by only one bolt. Each slot level above 6 adds one more bolt (nUp). A target can also be an object. The 30-ft limit around the first target needs zones." },

  "Circle of Death": { kind: "save", target: "area", area: { shape: "sphere", size: 60 }, save: "CON", half: true, dmg: [{ dice: "8d8", type: "necrotic" }], up: "2d8",
    notes: "A 60-ft-radius Sphere from a point within 150 ft. It catches every creature in it, allies included." },

  "Conjure Fey": { kind: "attack", target: "enemy", atk: true, conc: true, dur: "fight", dmg: [{ dice: "3d12+MOD", type: "psychic" }], up: "1d12",
    onHit: [{ cond: "frightened", until: "srcTurnStart" }],
    repeat: { econ: "bonus", atk: true, dmg: [{ dice: "3d12+MOD", type: "psychic" }], up: "1d12", onHit: [{ cond: "frightened", until: "srcTurnStart" }] },
    notes: "A Medium Fey spirit appears within 60 ft and you make a melee spell attack from it against a creature within 5 ft of it: 3d12 + your spellcasting modifier Psychic, and the target is Frightened until the start of your next turn, with you and the spirit as the source. As a Bonus Action on later turns you teleport the spirit up to 30 ft and attack again. The spirit cannot be attacked. The teleport needs zones." },

  "Disintegrate": { kind: "save", target: "enemy", save: "DEX", dmg: [{ dice: "10d6+40", type: "force" }], up: "3d6",
    notes: "No damage on a successful save. A creature reduced to 0 Hit Points is turned to gray dust with its nonmagical gear, and can come back only through True Resurrection or Wish. The spell also destroys a Large or smaller nonmagical object or a creation of force (a Wall of Force): not a combat effect here." },

  "Eyebite": { kind: "save", target: "enemy", save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "unconscious", until: "nextHit" }],
    repeat: { econ: "action", save: "WIS", onFail: [{ cond: "unconscious", until: "nextHit" }] },
    notes: "Models the Asleep option: the target has the Unconscious condition until it takes any damage (modelled as the next hit; another creature can also spend an action to shake it awake). The other options are Panicked (Frightened, and it must Dash away from you each turn; ends if it gets 60 ft away out of sight) and Sickened (Poisoned). On each of your later turns you use a Magic action to target a new creature, or the same one if it has not succeeded against this casting. The target must be within 60 ft and you must see it." },

  "Flesh to Stone": { kind: "save", target: "enemy", save: "CON", conc: true, dur: "rounds:10",
    onFail: [{ cond: "restrained", until: "conc", notTypes: ["Construct"] }],
    onSuccess: [{ mod: { speedMult: 0 }, until: "srcTurnStart" }],
    notes: "Approximation. A failed save makes the target Restrained for the spell. At the end of each of its turns it saves again: three successes (not necessarily in a row) end the spell, three failures turn it to stone (Petrified) for the duration, and for good if you hold Concentration for the full minute (only Greater Restoration or similar magic undoes it). The vocabulary cannot count saves, so it is Restrained throughout with no repeat save. A success leaves its Speed at 0 until the start of your next turn. Constructs automatically succeed." },

  "Globe of Invulnerability": { kind: "utility", target: "self", conc: true, dur: "rounds:10", area: { shape: "emanation", size: 10 },
    notes: "An immobile 10-ft Emanation around you. A spell of level 5 or lower cast from outside can't affect anything inside: it can target a creature inside but does nothing, and the area inside is cut out of any area that spell makes. Each slot level above 6 raises the blocked level by 1. The engine needs a way to cancel a spell by its level when the target is inside the globe; nothing in the modifier list does that." },

  "Harm": { kind: "save", target: "enemy", save: "CON", half: true, dmg: [{ dice: "14d6", type: "necrotic" }],
    onFail: [{ maxHpReduce: true }],
    notes: "On a failed save the target also has its Hit Point maximum reduced by the Necrotic damage it took; the reduction can't take the maximum below 1. A success takes half damage and no reduction." },

  "Heal": { kind: "heal", target: "creature", heal: "70", healUp: "10",
    notes: "Restores 70 Hit Points (+10 per slot level above 6) and ends the Blinded, Deafened and Poisoned conditions on the target. Ending conditions is not modelled by kind heal; the engine needs a cure effect." },

  "Mass Suggestion": { kind: "save", target: "enemy", n: 12, save: "WIS", dur: "fight",
    onFail: [{ cond: "charmed", until: "nextHit" }, { cond: "incapacitated", until: "nextHit" }],
    notes: "Up to twelve creatures you can see that can hear and understand you. The suggestion can't obviously harm them or their allies, so in a fight it is 'stop fighting': each target stands down until you or your allies damage it (modelled as the next hit; the engine should end it on any damage). Not concentration; the duration is 24 hours (10 days at slot 7, 30 days at 8, 366 days at 9). The suggestion ends for a target when the task is done." },

  "Otiluke's Freezing Sphere": { kind: "save", target: "area", area: { shape: "sphere", size: 60 }, save: "CON", half: true, dmg: [{ dice: "10d6", type: "cold" }], up: "1d6",
    notes: "A 60-ft-radius Sphere from a point within 300 ft. If it strikes water it freezes the surface to a depth of 6 in over 30 ft square for 1 minute, and creatures swimming there are Restrained (an Athletics check against your save DC frees them): not modelled. You can instead hold the globe after casting and throw it later; it explodes on its own after 1 minute." },

  "Otto's Irresistible Dance": { kind: "save", target: "enemy", save: "WIS", conc: true, dur: "rounds:10",
    onFail: [{ cond: "charmed", until: "conc" }, { mod: { atkDis: true, saveDis: ["DEX"], attackersAdv: true }, until: "conc" }],
    onSuccess: [{ mod: { speedMult: 0 }, until: "targetTurnEnd" }],
    notes: "On a failed save the target is Charmed, must spend all its movement dancing in place, has Disadvantage on DEX saves and attack rolls, and attackers have Advantage against it. On each of its turns it can use its action to collect itself and repeat the save, ending the spell on a success: that costs its action, so it is not the free end-of-turn repeat (repeat: end) and is left out. A success makes it dance in place (Speed 0) until the end of its next turn." },

  "Summon Fiend": { kind: "summon", conc: true, dur: "fight",
    summon: { name: "Fiendish Spirit", econ: "free", atk: "SPELL", dmg: [{ dice: "2d6+9", type: "fire" }], up: 1,
              ac: "12+SLOT", hp: "40+15*(SLOT-6)" },
    notes: "Models the Devil form: Fiery Strike (melee reach 5 ft or ranged 150 ft), 2d6 + 3 + slot level Fire, Hit Points 40 + 15 per slot level above 6, flies 60 ft. Demon form: Bite 1d12 + 3 + slot level Necrotic, Hit Points 50 + 15 per level above 6, climbs 40 ft, and Death Throes (DEX save, 2d10 + slot level Fire, half on a success, each creature in a 10-ft Emanation) when it drops to 0 or the spell ends. Yugoloth form: Claws 1d8 + 3 + slot level Slashing and a free teleport of 30 ft after each attack, Hit Points 60 + 15 per level above 6. Multiattack: half the slot level (round down) attacks. Large Fiend, AC 12 + slot level, Speed 40 ft, Resistance to Fire, immune to Poison and Poisoned, Magic Resistance (Advantage on saves against spells). Requires a 600+ GP vial of blood." },

  "Sunbeam": { kind: "save", target: "area", area: { shape: "line", size: 60 }, save: "CON", half: true, dmg: [{ dice: "6d8", type: "radiant" }], conc: true, dur: "rounds:10",
    onFail: [{ cond: "blinded", until: "srcTurnStart" }],
    repeat: { econ: "action", save: "CON", half: true, dmg: [{ dice: "6d8", type: "radiant" }], onFail: [{ cond: "blinded", until: "srcTurnStart" }] },
    notes: "A 5-ft-wide, 60-ft-long Line from you. A failed save takes 6d8 Radiant and is Blinded until the start of your next turn; a success takes half and is not Blinded. On each of your later turns you take a Magic action to make a new Line. A mote of sunlight above you sheds bright light in a 30-ft radius and dim light for another 30 ft; it is sunlight. The Line's reach needs zones." },

  "Wall of Ice": { kind: "save", target: "link", area: { shape: "line", size: 100 }, save: "DEX", half: true, dmg: [{ dice: "10d6", type: "cold" }], up: "2d6",
    conc: true, dur: "fight", zone: true, zoneFx: { blocks: true, until: "conc" },
    notes: "Ten 10-ft panels, a dome or a globe up to 10 ft in radius; 1 ft thick. A creature in a panel's space when it appears is pushed to the side you choose and makes a DEX save: 10d6 Cold, half on a success (+2d6 per slot level above 6). Nothing crosses it until a panel is broken: AC 12, 30 Hit Points per 10-ft section, Immune to Cold, Poison and Psychic, Vulnerable to Fire. A broken section leaves frigid air: a creature moving through it for the first time on a turn makes a CON save, 5d6 Cold, half on a success (+1d6 per slot level above 6). The frigid-air hazard and the section Hit Points are not modelled." },

  "Wall of Thorns": { kind: "save", target: "area", area: { shape: "line", size: 60 }, save: "DEX", half: true, dmg: [{ dice: "7d8", type: "piercing" }], up: "1d8",
    conc: true, dur: "fight", zone: true,
    zoneFx: { terrain: "difficult",
      hazard: { name: "Wall of Thorns", on: ["enter", "end"], save: "DEX", dmg: [{ dice: "7d8", type: "slashing" }], half: true }, until: "conc" },
    notes: "A wall up to 60 ft long, 10 ft high and 5 ft thick, or a circle 20 ft across and up to 20 ft high. It blocks line of sight. Creatures in it when it appears make a DEX save: 7d8 Piercing, half on a success. A creature can move through it, spending 4 ft of movement per foot (modelled as Difficult Terrain, which is only double). The first time a creature enters the wall on a turn or ends its turn there it makes a DEX save: 7d8 Slashing, half on a success (the hazard). Each type rises 1d8 per slot level above 6: up covers the Piercing part and the hazard stays at 7d8." },

  // ---------------------------------------------------------------------------------------------- Level 7

  "Conjure Celestial": { kind: "aura", target: "area", area: { shape: "cylinder", size: 10 }, conc: true, dur: "fight", zone: true,
    save: "DEX", half: true, dmg: [{ dice: "6d12", type: "radiant" }], up: "1d12", when: "turnEnd",
    notes: "A pillar of light, a 10-ft-radius, 40-ft-high Cylinder within 90 ft. Models Searing Light: whenever the Cylinder moves into a creature's space, or a creature you can see enters it or ends its turn there, you can bathe it: DEX save, 6d12 Radiant, half on a success, once per turn per creature. You choose the light for each creature, so Healing Light (the target regains 4d12 + your spellcasting modifier Hit Points, +1d12 per slot level above 7) is the other option; it heals allies and is not modelled because an aura only hurts enemies. When you move on your turn you can also move the Cylinder up to 30 ft: needs zones." },

  "Delayed Blast Fireball": { kind: "save", target: "area", area: { shape: "sphere", size: 20 }, save: "DEX", half: true, dmg: [{ dice: "12d6", type: "fire" }], up: "1d6",
    conc: true, dur: "rounds:10", zone: true,
    notes: "Approximation. A bead lodges at a point within 150 ft and bursts in a 20-ft-radius Sphere when the spell ends. Its damage grows by 1d6 each time your turn ends before it bursts, so the longer you wait the more it deals; this entry resolves it at once at its base 12d6. A creature that touches the bead makes a DEX save or sets it off, and on a success may throw it up to 40 ft; it bursts where it lands. Upcasting adds 1d6 to the base damage per slot level above 7." },

  "Divine Word": { kind: "save", econ: "bonus", target: "area", area: { shape: "emanation", size: 30 }, save: "CHA",
    onFail: [{ cond: "incapacitated", until: "fight", types: ["Celestial", "Elemental", "Fey", "Fiend"], note: "Forced back to its plane of origin; it can't return to this plane for 24 hours by any means short of Wish." },
             { note: "Effect by the target's current Hit Points when it fails (only if it has 50 or fewer): 41-50 Deafened for 1 minute; 31-40 Blinded and Deafened for 10 minutes; 21-30 Blinded, Deafened and Stunned for 1 hour; 20 or fewer dies." }],
    notes: "Bonus Action; each creature of your choice that you can see within 30 ft. A Celestial, Elemental, Fey or Fiend that fails is banished to its plane of origin whatever its Hit Points (modelled as Incapacitated for the fight, as with Banishment). The Hit Point tiers are listed in the rider note only: the vocabulary has no current-HP gate on riders, so the engine or the player applies them by the target's current Hit Points. No damage." },

  "Finger of Death": { kind: "save", target: "enemy", save: "CON", half: true, dmg: [{ dice: "7d8+30", type: "necrotic" }],
    notes: "A Humanoid killed by this spell rises at the start of your next turn as a Zombie that follows your verbal orders: not modelled (the engine has no way to raise a new ally from a kill)." },

  "Fire Storm": { kind: "save", target: "area", area: { shape: "cube", size: 25 }, save: "DEX", half: true, dmg: [{ dice: "7d10", type: "fire" }],
    notes: "Up to ten 10-ft Cubes that you arrange as you like, each touching at least one other, within 150 ft. The cube of size 25 stands in for the total area. Flammable objects not worn or carried start burning." },

  "Forcecage": { kind: "debuff", target: "enemy", conc: true, dur: "fight", zone: true,
    onFail: [{ cond: "incapacitated", until: "conc", sizeMax: "Large" }],
    notes: "Approximation. No saving throw to be trapped. Models the solid box (up to 10 ft on a side): nothing passes through it in either direction, so the creature inside cannot hurt or be hurt from outside and is treated as out of the fight while you concentrate. A creature larger than the box is pushed out instead (sizeMax Large). It is not really Incapacitated and can still act inside. The cage form (up to 20 ft on a side, bars) lets creatures inside attack out with reach or ranged attacks and traps several creatures: not modelled. A creature inside that tries to teleport or travel planes must first make a CHA save, and on a failure the attempt is wasted. It cannot be dispelled. Requires 1,500+ GP of ruby dust." },

  "Mordenkainen's Sword": { kind: "attack", target: "enemy", atk: true, conc: true, dur: "rounds:10", dmg: [{ dice: "4d12+MOD", type: "force" }],
    repeat: { econ: "bonus", atk: true, dmg: [{ dice: "4d12+MOD", type: "force" }] },
    notes: "A spectral sword hovers within 90 ft. When it appears you make a melee spell attack against a target within 5 ft of it: 4d12 + your spellcasting modifier Force. On your later turns you use a Bonus Action to move it up to 30 ft and make the attack again against the same target or a different one. The 5-ft and 30-ft limits need zones. The sword cannot be attacked." },

  "Power Word Fortify": { kind: "temphp", target: "allies", n: 4, temp: "30", dur: "fight",
    notes: "120 Temporary Hit Points divided among up to six creatures you can see within 60 ft, no save, no attack roll. Modelled as 30 each for four creatures. For a different number of creatures, split 120 as you like." },

  "Prismatic Spray": { kind: "save", target: "area", area: { shape: "cone", size: 60 }, save: "DEX", half: true,
    dmg: [{ dice: "12d6", type: ["fire", "acid", "lightning", "poison", "cold"] }],
    notes: "Approximation. Each creature in the 60-ft Cone is struck by one ray chosen by 1d8: Red Fire, Orange Acid, Yellow Lightning, Green Poison, Blue Cold (each 12d6, half on a success); Indigo (Restrained, then a CON save at the end of each of its turns: three successes free it, three failures Petrify it); Violet (Blinded, then a WIS save at the start of your next turn: a failure sends it to another plane); 8 means two rays (reroll any 8). The damage type is rolled per target in the rules; here the caster's list stands in for it. Three of the eight results are not damage, so this entry deals more damage and less control than the real spell." },

  "Reverse Gravity": { kind: "save", target: "area", area: { shape: "cylinder", size: 50 }, save: "DEX", dmg: [{ dice: "10d6", type: "bludgeoning" }],
    conc: true, dur: "rounds:10", zone: true,
    onFail: [{ cond: "restrained", until: "conc" }],
    notes: "Approximation. Gravity reverses in a 50-ft-radius, 100-ft-high Cylinder. Unanchored creatures and objects fall upward to the top, and a creature can make a DEX save to grab a fixed object it can reach and so avoid falling. A creature that strikes a ceiling or anchored object takes falling damage as in a normal fall; one that reaches the top hovers there, and all of them fall downward when the spell ends. Modelled as the 10d6 Bludgeoning of a 100-ft fall dealt to a creature that fails, applied at once, and Restrained while it hovers. A success takes nothing." }
});

window.SPELL_NONCOMBAT = Object.assign(window.SPELL_NONCOMBAT || {}, {
  // Level 6
  "Contingency": "utility",
  "Create Undead": "summon-outside-combat",
  "Drawmij's Instant Summons": "ritual",
  "Find the Path": "exploration",
  "Forbiddance": "ritual",
  "Guards and Wards": "defense-outside-combat",
  "Heroes' Feast": "defense-outside-combat",
  "Magic Jar": "utility",
  "Move Earth": "utility",
  "Planar Ally": "summon-outside-combat",
  "Programmed Illusion": "utility",
  "Tasha's Bubbling Cauldron": "utility",
  "Transport via Plants": "travel",
  "True Seeing": "detection",
  "Wind Walk": "travel",
  "Word of Recall": "travel",
  // Level 7
  "Etherealness": "travel",
  "Mirage Arcane": "utility",
  "Mordenkainen's Magnificent Mansion": "utility",
  "Plane Shift": "travel",
  "Project Image": "utility",
  "Regenerate": "healing-outside-combat",
  "Resurrection": "healing-outside-combat",
  "Sequester": "utility",
  "Simulacrum": "summon-outside-combat",
  "Symbol": "defense-outside-combat",
  "Teleport": "travel"
});
// Combat data for every level 8 and level 9 spell in data_spells_*.js (34 spells: 18 at level 8, 16 at level 9).
// Contract: docs/Combat_Schema.md sections 0, A, E and F.2. Registers into window.SPELL_FX and window.SPELL_NONCOMBAT.
// 21 spells go in SPELL_FX (11 at level 8, 10 at level 9); 13 go in SPELL_NONCOMBAT (7 at level 8, 6 at level 9).
//
// SOURCES (2024 rules only)
//   1. SRD 5.2.1 through the open5e v2 API (document__key=srd-2024): 33 of the 34 spells. Telepathy is not in the SRD; it
//      is classified from the description in data_spells_4.js alone (it is a 24-hour link with a willing creature).
//   2. dnd2024.wikidot.com (2024 Player's Handbook text): Power Word Stun, checked against the SRD wording.
//
// CONVENTIONS USED IN THIS FILE
//   - Duration: a 1-minute spell has dur "rounds:10". Anything of 10 minutes or longer has dur "fight" (the rest of the
//     fight), because no fight lasts 100 rounds. Same as spells_4_5.js.
//   - Casting time decides the file. A spell with a casting time longer than one action cannot be cast in a fight, so it
//     goes in SPELL_NONCOMBAT even when its effect would help in one (Foresight, Imprisonment, Tsunami, Antipathy/
//     Sympathy). Same policy as spells_2_3.js. Wish, Gate, Astral Projection and similar are noncombat too: Wish's useful
//     fight use is to duplicate another spell, which the player casts as that spell.
//   - Walls and lingering areas follow F.2: the immediate save and damage stay on the spell, and zoneFx carries the
//     lasting part (a hazard for a cloud or wall that hurts those who stay in it, terrain, obscured, blocks). A wall
//     that cannot be crossed (Prismatic Wall) is kind "zone" with target "link" and blocks: true.
//   - A debuff with no save key puts its onFail riders on the target with no save. It is used for the spells that work
//     with no saving throw (Maze, Power Word Stun).
//   - repeat with no econ is an automatic follow-up on the affected creature's own turn (Weird, like Phantasmal Killer).
//   - Temporary Hit Points that stand for a transformation (Animal Shapes, Shapechange) use kind "temphp".
//
// SIMPLIFICATIONS (each is repeated in the entry's notes)
//   - Animal Shapes and Shapechange are modelled as the Temporary Hit Points the new form grants and nothing else. The
//     form's statistics, attacks, the loss of spellcasting (Animal Shapes) and the choice of form are not modelled.
//     Animal Shapes uses 60 (a Giant Constrictor Snake, a typical Large Beast of CR 2); Shapechange uses 10 per class
//     level, a rough Hit Point total for a creature of CR equal to your level.
//   - True Polymorph is modelled like Polymorph in spells_4_5.js: the target becomes a harmless Beast, written as
//     Incapacitated until it is hit. Turning an ally into a stronger creature, an object into a creature or a creature
//     into an object are not modelled.
//   - Maze and Power Word Stun use the nearest condition: Maze is Incapacitated while you concentrate (the target can try
//     a DC 20 Investigation check each turn to escape); Power Word Stun is Stunned for two rounds (the real condition
//     lasts until a CON save at the end of one of its turns succeeds), and it also applies the Speed 0 rider.
//   - Power Word Stun cannot gate on "150 Hit Points or fewer": the Stunned rider is given for the case the spell is
//     built for and the note tells the player the Speed 0 case. Aim it at a creature with 150 Hit Points or fewer.
//   - Storm of Vengeance is modelled as an aura that deals 2d6 per turn, an average of the escalating table (the table
//     is in the notes). The first-turn CON save and the Deafened condition are not applied.
//   - Prismatic Wall is a barrier that cannot be crossed. The real wall lets the caster and chosen creatures through and
//     hurts others one colour at a time; the layer table is in the notes.
//   - Mass Heal restores each of up to six allies to full Hit Points; the real spell has a pool of 700 Hit Points that you
//     split. With a party of four that is almost always the same result.
//   - Earthquake applies Prone and broken Concentration to creatures that fail a save on the ground in a 100-ft radius at
//     casting and at the end of each of your turns; fissures and collapsing structures are not modelled.
//   - Time Stop is a utility: the engine would need to give the caster 1d4 + 1 extra turns in a row.
//   - Befuddlement's loss of spellcasting is a rider note; there is no modifier for "cannot cast spells".
//
// ALLY QA FIX (tests/suites/ally.js): Holy Aura had target "allies" and an area but no `n`. The engine
//   (effectSteps) only counts `n`, so with no `n` the spell reached ONE creature (an ally aura buffed a single ally and not
//   the caster). Combat_Schema A says "allies" goes with `n`. They now carry n: 4 (a full party: you and up to three allies).

window.SPELL_FX = Object.assign(window.SPELL_FX || {}, {

  // ---------------------------------------------------------------------------------------------- Level 8

  "Animal Shapes": { kind: "temphp", target: "allies", n: 4, temp: "60", dur: "fight",
    notes: "Approximation. Each willing creature you can see within 30 ft becomes a Large or smaller Beast of CR 4 or lower that you choose (a different form for each), and gains Temporary Hit Points equal to the Hit Points of the first form it takes. It keeps its creature type, Hit Points, Intelligence, Wisdom and Charisma, uses the Beast's other statistics and attacks, cannot cast spells, and its gear melds into the form. The Temporary Hit Points vanish if any remain when the spell ends. Modelled as 60 Temporary Hit Points (a Giant Constrictor Snake) for up to four creatures, and nothing else. A target can end it as a Bonus Action; you can change the forms with a Magic action on later turns. Not concentration; lasts 24 hours." },

  "Antimagic Field": { kind: "utility", target: "self", conc: true, dur: "fight", area: { shape: "emanation", size: 10 },
    notes: "A 10-ft Emanation around you. Inside it nobody can cast spells, take the Magic action or create magical effects, and magic cannot target or affect anything inside. Magic item properties stop working inside; areas of effect made by spells cannot extend into it; no teleporting or planar travel into or out of it. Summoned creatures and ongoing spells (except an Artifact's or a deity's) are suppressed while inside, and time suppressed counts against the duration. It cuts both ways: your own spells fail inside. The engine needs a rule that shuts off magic by position." },

  "Befuddlement": { kind: "save", target: "enemy", save: "INT", half: true, dmg: [{ dice: "10d12", type: "psychic" }],
    onFail: [{ note: "Can't cast spells or take the Magic action. At the end of every 30 days it repeats the save; Greater Restoration, Heal or Wish also end it." }],
    notes: "On a failed save the target also loses the ability to cast spells and to take the Magic action, which lasts far beyond a fight (the vocabulary has no modifier for it). A success takes half damage and no other effect." },

  "Dominate Monster": { kind: "save", target: "enemy", save: "WIS", conc: true, dur: "fight",
    onFail: [{ cond: "charmed", until: "conc", resaveOnDamage: true }],
    notes: "Works on any creature type. The target saves with Advantage if you or your allies are fighting it, and repeats the save whenever it takes damage, ending the spell on a success. While Charmed you command it by telepathy at no action cost, and it acts on your side: the engine needs a 'controlled by the caster' state, which Charmed alone doesn't give. You can command its Reaction by spending your own. A level 9 slot lets you concentrate for up to 8 hours." },

  "Earthquake": { kind: "aura", target: "area", area: { shape: "cylinder", size: 100 }, save: "DEX", conc: true, dur: "rounds:10", zone: true, when: "turnEnd",
    onFail: [{ cond: "prone" }, { note: "Concentration broken" }],
    zoneFx: { terrain: "difficult", until: "conc" },
    notes: "A 100-ft-radius circle within 500 ft. The ground there is Difficult Terrain. When you cast it and at the end of each of your turns, each creature on the ground in the area (allies and you included) makes a DEX save, and on a failure falls Prone and its Concentration is broken. Modelled as the aura applying at the end of each of your turns; the first application is when it is cast. Also: 1d6 fissures (1d10 x 10 ft deep, 10 ft wide) open at the end of the turn you cast it, and a creature in one makes a DEX save or falls in; and the tremor deals 50 Bludgeoning damage to each structure on the ground in the area at casting and at the end of each of your turns, with collapse damage (12d6) near falling structures. Fissures and structures are not modelled." },

  "Holy Aura": { kind: "buff", target: "allies", n: 4, area: { shape: "emanation", size: 30 }, conc: true, dur: "rounds:10",
    mods: { saveAdv: "all", attackersDis: true },
    notes: "You emit a 30-ft Emanation. While in it, creatures of your choice have Advantage on all saving throws, and other creatures have Disadvantage on attack rolls against them. When a Fiend or an Undead hits an affected creature with a melee attack roll, the attacker makes a CON save or is Blinded until the end of its next turn: not modelled (the vocabulary has no rider for what happens to the attacker when it hits)." },

  "Incendiary Cloud": { kind: "save", target: "area", area: { shape: "sphere", size: 20 }, save: "DEX", half: true, dmg: [{ dice: "10d8", type: "fire" }],
    conc: true, dur: "rounds:10", zone: true,
    zoneFx: { obscured: "heavy",
      hazard: { name: "Incendiary Cloud", on: ["enter", "end"], save: "DEX", dmg: [{ dice: "10d8", type: "fire" }], half: true }, until: "conc" },
    notes: "A 20-ft-radius Sphere of embers and smoke within 150 ft, Heavily Obscured. A creature makes a DEX save when it appears, when the Sphere moves into its space, and when it enters or ends its turn there (once per turn): 10d8 Fire, half on a success. The cloud moves 10 ft away from you in a direction you choose at the start of each of your turns, so where it ends up needs zones. A strong wind (Gust of Wind) disperses it." },

  "Maze": { kind: "debuff", target: "enemy", conc: true, dur: "fight",
    onFail: [{ cond: "incapacitated", until: "conc" }],
    notes: "Approximation. No saving throw. The target is banished to a labyrinthine demiplane for up to 10 minutes. On each of its turns it can take the Study action to make a DC 20 Intelligence (Investigation) check; a success ends the spell and it returns to the space it left (or the nearest free one). Modelled as Incapacitated while you concentrate; treat the creature as removed from the fight. The escape check is not modelled and matters for creatures with a high Intelligence." },

  "Mind Blank": { kind: "buff", target: "creature", dur: "fight",
    mods: { immune: ["psychic"], condImmune: ["charmed"] },
    notes: "One willing creature you touch, for 24 hours: Immunity to Psychic damage and the Charmed condition. It is also hidden from anything that would sense its emotions or alignment, read its thoughts or locate it by magic, and no spell, not even Wish, can gather information about it or control its mind: the last two have no fight effect." },

  "Power Word Stun": { kind: "debuff", target: "enemy",
    onFail: [{ cond: "stunned", until: "rounds:2", note: "Only if the target has 150 Hit Points or fewer; it saves CON at the end of each of its turns to recover. If it has more than 150, its Speed is 0 until the start of your next turn and it is not Stunned." },
             { mod: { speedMult: 0 }, until: "srcTurnStart" }],
    notes: "Approximation. No saving throw. A target with 150 Hit Points or fewer has the Stunned condition and makes a CON save at the end of each of its turns, ending it on a success. A target above 150 Hit Points has its Speed set to 0 until the start of your next turn. There is no Hit Point gate on riders, so both riders are given: aim the spell at a creature with 150 Hit Points or fewer. Stunned is modelled as lasting two rounds (the real length is until a CON save succeeds)." },

  "Sunburst": { kind: "save", target: "area", area: { shape: "sphere", size: 60 }, save: "CON", half: true, dmg: [{ dice: "12d6", type: "radiant" }],
    onFail: [{ cond: "blinded", until: "save", repeat: "end" }],
    notes: "A 60-ft-radius Sphere within 150 ft. A failed save takes 12d6 Radiant and is Blinded; a Blinded creature repeats the CON save at the end of each of its turns, ending the condition on a success. A success takes half damage and is not Blinded. It also dispels Darkness made by any spell in the area: not modelled." },

  // ---------------------------------------------------------------------------------------------- Level 9

  "Mass Heal": { kind: "heal", target: "allies", n: 6, fullHeal: true,
    notes: "Approximation. You restore up to 700 Hit Points, divided as you choose among any number of creatures you can see within 60 ft, and each creature healed has the Blinded, Deafened and Poisoned conditions removed. Modelled as each of up to six allies healed to full, which matches the real spell whenever the party's missing Hit Points total 700 or less. Ending the conditions is not modelled." },

  "Meteor Swarm": { kind: "save", target: "area", area: { shape: "sphere", size: 40 }, save: "DEX", half: true,
    dmg: [{ dice: "20d6", type: "fire" }, { dice: "20d6", type: "bludgeoning" }],
    notes: "Four blazing orbs fall at four different points within 1 mile that you can see; each bursts in a 40-ft-radius Sphere. A creature in more than one Sphere is affected once. Modelled as one Sphere: the other three are separate points the engine needs zones to place. A nonmagical object in the area takes the damage and starts burning if flammable." },

  "Power Word Heal": { kind: "heal", target: "creature", fullHeal: true,
    notes: "The target regains all its Hit Points, and the Charmed, Frightened, Paralyzed, Poisoned and Stunned conditions on it end; if it is Prone it can stand up using its Reaction. Ending the conditions and the free stand are not modelled; the engine needs a cure effect." },

  "Power Word Kill": { kind: "auto", target: "enemy", killBelow: 100, dmg: [{ dice: "12d12", type: "psychic" }],
    notes: "No saving throw and no attack roll. A creature with 100 Hit Points or fewer dies. Otherwise it takes 12d12 Psychic." },

  "Prismatic Wall": { kind: "zone", target: "link", dur: "fight", zone: true,
    zoneFx: { blocks: true, until: "fight" },
    notes: "Approximation. A wall of seven layers up to 90 ft long, 30 ft high and 1 inch thick (or a globe up to 30 ft across), for 10 minutes, no Concentration. It is opaque, sheds bright light 100 ft and dim light 100 ft more, and blinds (CON save, 1 minute) any creature that sees it and moves within 20 ft or starts its turn there. You and creatures you name can cross it freely; anyone else makes a DEX save against each layer in order from red to violet: Red 12d6 Fire, Orange 12d6 Acid, Yellow 12d6 Lightning, Green 12d6 Poison, Blue 12d6 Cold (each half on a success), Indigo (Restrained, then CON saves at the end of its turns: three successes free it, three failures Petrify it), Violet (Blinded, then a WIS save at the start of your next turn: a failure sends it to another plane). Layers fall one at a time in order to specific counters. Modelled as a barrier nothing crosses, which suits the enemy and not you or your allies; the engine should let the caster's side through." },

  "Shapechange": { kind: "temphp", target: "self", conc: true, dur: "fight", temp: "CLASS_LEVEL*10",
    notes: "Approximation. You turn into a creature you have seen with a Challenge Rating no higher than your level or CR (not a Construct or an Undead), and gain Temporary Hit Points equal to the Hit Points of the first form. Your game statistics are replaced by the form's, except you keep your creature type, alignment, personality, Intelligence, Wisdom, Charisma, Hit Points, proficiencies, ability to communicate and your spellcasting. The Temporary Hit Points vanish if any remain when the spell ends. Modelled as 10 Temporary Hit Points per class level and nothing else; the form's attacks, Speed and features are not modelled. A Magic action changes the form (and grants new Temporary Hit Points)." },

  "Storm of Vengeance": { kind: "aura", target: "area", area: { shape: "sphere", size: 360 }, conc: true, dur: "rounds:10", when: "turnEnd",
    dmg: [{ dice: "2d6", type: "lightning" }],
    notes: "Approximation. A storm cloud with a 360-ft radius over a point within 1 mile. When it appears each creature under it makes a CON save or takes 2d6 Thunder and is Deafened for the duration (not applied here). At the start of each of your later turns: turn 2 acid rain, 4d6 Acid to each creature and object; turn 3 six bolts at six creatures or objects, each making a DEX save for 10d6 Lightning (half on a success); turn 4 hail, 2d6 Bludgeoning to each creature; turns 5-10 gales and freezing rain, 1d6 Cold to each creature, the area is Difficult Terrain and Heavily Obscured, and ranged weapon attacks are impossible. The aura deals 2d6 a turn, about the average of turns 2 to 10 once the six bolts are spread over the creatures under the cloud." },

  "Time Stop": { kind: "utility", target: "self",
    notes: "You take 1d4 + 1 turns in a row while time stands still for everyone else; you act and move as normal. The spell ends if an action you take, or an effect you create, affects a creature other than you or something another creature wears or carries, and if you move more than 1,000 ft from where you cast it. In a fight it is mostly set-up: buffing yourself, positioning, casting a spell that makes an area or a wall. The engine would need to give the caster extra consecutive turns." },

  "True Polymorph": { kind: "save", target: "enemy", save: "WIS", conc: true, dur: "fight",
    onFail: [{ cond: "incapacitated", until: "nextHit" }],
    notes: "Approximation, modelled like Polymorph. The target becomes a creature you choose with a Challenge Rating no higher than its own or your level; it keeps its Hit Points, alignment and personality, gains Temporary Hit Points equal to the new form's, can't speak or cast spells, and its gear melds into the form. Choosing the weakest creature leaves it nearly harmless and the spell ends once the Temporary Hit Points are gone, so it is Incapacitated until the next hit. A willing creature takes no save; turning an ally into a strong creature, an object into a creature, or a creature into an object is not modelled. Concentrating for the full hour makes the change last until dispelled." },

  "Weird": { kind: "save", target: "area", area: { shape: "sphere", size: 30 }, save: "WIS", half: true, dmg: [{ dice: "10d10", type: "psychic" }],
    conc: true, dur: "rounds:10",
    onFail: [{ cond: "frightened", until: "conc", repeat: "end" }],
    repeat: { save: "WIS", when: "targetTurnEnd", dmg: [{ dice: "5d10", type: "psychic" }] },
    notes: "Each creature of your choice in a 30-ft-radius Sphere within 120 ft. A failed save takes 10d10 Psychic and is Frightened for the duration; a success takes half and is not Frightened. A Frightened target repeats the save at the end of each of its turns: on a failure it takes 5d10 Psychic, on a success the spell ends for it. repeat has no econ: it is automatic on the target's turn and applies to each Frightened target." }
});

window.SPELL_NONCOMBAT = Object.assign(window.SPELL_NONCOMBAT || {}, {
  // Level 8
  "Antipathy/Sympathy": "defense-outside-combat",
  "Clone": "healing-outside-combat",
  "Control Weather": "utility",
  "Demiplane": "utility",
  "Glibness": "social",
  "Telepathy": "social",
  "Tsunami": "utility",
  // Level 9
  "Astral Projection": "travel",
  "Foresight": "defense-outside-combat",
  "Gate": "travel",
  "Imprisonment": "utility",
  "True Resurrection": "healing-outside-combat",
  "Wish": "utility"
});
