import { supabase } from './supabase'

const ADJECTIVES = [
  'Adventurous', 'Angry', 'Barefoot', 'Bashful', 'Beefy', 'Bendy', 'Big', 'Blue', 'Bony', 'Brave',
  'Bronze', 'Busy', 'Calm', 'Cheerful', 'Chilly', 'Clean', 'Comical', 'Cool', 'Crazy', 'Creepy',
  'Cuddly', 'Curious', 'Dangerous', 'Dizzy', 'Fast', 'Fearless', 'Fierce', 'Friendly', 'Funny', 'Gentle',
  'Giant', 'Golden', 'Greedy', 'Green', 'Grey', 'Grumpy', 'Happy', 'Hungry', 'Hyper', 'Icy',
  'Incredible', 'Invisible', 'Jumpy', 'Lava', 'Lazy', 'Little', 'Lone', 'Loud', 'Lucky', 'Mad',
  'Magic', 'Maroon', 'Massive', 'Messy', 'Mighty', 'Moody', 'Muddy', 'Neat', 'Nervous', 'Nice',
  'Noisy', 'Obnoxious', 'Orange', 'Perfect', 'Pink', 'Popular', 'Prickly', 'Purple', 'Quick', 'Quiet',
  'Red', 'Rough', 'Scary', 'Serious', 'Shaggy', 'Shaky', 'Shifty', 'Shiny', 'Shoeless', 'Short',
  'Shy', 'Silly', 'Silver', 'Skinny', 'Sleepy', 'Slippery', 'Small', 'Smart', 'Sneaky', 'Speedy',
  'Sporty', 'Spotted', 'Squeezy', 'Sticky', 'Strange', 'Striped', 'Super', 'Tall', 'Thirsty', 'Tiny',
  'Tough', 'Trusty', 'White', 'Wild', 'Yellow', 'Young', 'Zany', 'Zippy',
]

const NOUNS = [
  'Ant', 'Axe', 'Bean', 'Bear', 'Bee', 'Beetle', 'Belly', 'Berry', 'Biker', 'Bird',
  'Bite', 'Boa', 'Bones', 'Boot', 'Brain', 'Bubbles', 'Bug', 'Burger', 'Cactus', 'Carrot',
  'Catfish', 'Cheetah', 'Chick', 'Chicken', 'Claw', 'Cloud', 'Clown', 'Club', 'Comet', 'Coyote',
  'Crab', 'Crown', 'Crumb', 'Crush', 'Diamond', 'Diver', 'Dolphin', 'Dragon', 'Drummer', 'Eagle',
  'Eel', 'Eye', 'Fang', 'Feather', 'Fire', 'Fish', 'Flame', 'Flipper', 'Fly', 'Flyer',
  'Foot', 'Fox', 'Gamer', 'Ghost', 'Glove', 'Goose', 'Grape', 'Hamburger', 'Hammer', 'Hawk',
  'Heart', 'Hero', 'Hippo', 'Hook', 'Hopper', 'Horse', 'Ice', 'Icicle', 'Jester', 'Joker',
  'Jumper', 'Kid', 'Knuckle', 'Laser', 'Leaf', 'Leopard', 'Lightning', 'Lion', 'Lizard', 'Lobster',
  'Melon', 'Monster', 'Moon', 'Mosquito', 'Ninja', 'Noodle', 'Ocean', 'Octopus', 'Onion', 'Owl',
  'Panda', 'Paw', 'Peanut', 'Pear', 'Pelican', 'Penguin', 'Plug', 'Popper', 'Raptor', 'Rider',
  'Ring', 'Rock', 'Runner', 'Scorpion', 'Seal', 'Seagull', 'Shadow', 'Shark', 'Shell', 'Singer',
  'Sinker', 'Skull', 'Skunk', 'Sky', 'Sneeze', 'Snowball', 'Socks', 'Speck', 'Spider', 'Spinner',
  'Sponge', 'Star', 'Starfish', 'Stomper', 'Storm', 'Sun', 'Sword', 'Thunder', 'Tiger', 'Toes',
  'Tomato', 'Tooth', 'Tornado', 'Tummy', 'Tuna', 'Turkey', 'Turtle', 'Typhoon', 'Walker', 'Warrior',
  'Whale', 'Wing', 'Wolf',
]

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

async function isUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('members')
    .select('id')
    .ilike('username', username)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

/**
 * Generates a unique Poptropica-style "Adjective Noun" username, checked
 * case-insensitively against existing members. Falls back to a numbered
 * suffix if 50 random attempts all collide.
 */
export async function generateUniqueUsername(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${randomFrom(ADJECTIVES)} ${randomFrom(NOUNS)}`
    if (!(await isUsernameTaken(candidate))) {
      return candidate
    }
  }

  // Extremely unlikely with 15,444 combinations, but handle it anyway.
  const base = `${randomFrom(ADJECTIVES)} ${randomFrom(NOUNS)}`
  for (let suffix = 2; suffix < 1000; suffix++) {
    const candidate = `${base} ${suffix}`
    if (!(await isUsernameTaken(candidate))) {
      return candidate
    }
  }

  throw new Error('Could not generate a unique username. Please try again.')
}
