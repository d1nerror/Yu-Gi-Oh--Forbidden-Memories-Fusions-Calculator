# FM Fusion Calculator

A companion app for **Yu-Gi-Oh! Forbidden Memories** (PS1). Keep it open on your phone or PC while you play: type the cards in your hand and it shows every fusion you can make.

It's free, works offline, and there's nothing to install. Card pictures need internet the first time they load.

## Open the app

- **On a phone or tablet:** open the app's link in your browser. To keep it one tap away, add it to your home screen:
  - iPhone: in Safari, tap Share, then *Add to Home Screen*.
  - Android: in Chrome, tap the menu, then *Add to Home screen*.
- **On a PC or Mac:** download `index.html` and double-click it. It opens in your browser and works without internet.

## How to use it

### Hand: what can I fuse right now?
1. Type a card name in the search box and pick it from the list. Arrow keys and Enter work too.
2. Add up to 5 cards, the same as your hand in the game.
3. On a computer, hover over a card for a closer look.
4. Every fusion appears below, strongest first. Use **Sort** to order by defense or by fewest cards used.
5. Tap a result to see the fusion order, its Guardian Stars, and any equip card in your hand that fits it.

Fusions that need two steps in a row and rituals (the ritual card plus its three monsters) are included.

### Lookup: everything about one card
Search any of the 722 cards to see:
- **Fuses with:** every partner and what they make together.
- **Made from:** which two cards fuse into it.
- **Ritual** and **Equips**, where the card has them.
- Its level, ATK/DEF and **Guardian Stars**.

Tap any card name to jump to it. Open **Guardian Star guide** to see which star beats which, and which monster types usually carry each star.

### Deck: how well does my deck fuse?
Add cards one at a time, or open **Paste a card list** and paste one card per line. Write `2x Baby Dragon` or `Baby Dragon x2` for copies. Decks hold up to 40 cards, with at most 3 copies of each.

You'll see:
- The share of your monsters that have a fusion partner in the deck.
- Your deck's strongest fusions.
- **Guardian Star coverage:** enemy stars nothing in your deck can beat, and which star to add.
- **Dead cards** that fuse with nothing else in your deck.
- **Cards that add fusions:** tap *Add* to try one.
- **Rituals within reach** and which cards they're missing.

### Saving your deck
You don't need to do anything: your deck and hand save automatically as you change them. They're still there when you close and reopen the app.

- Saves stay on the device and browser you used. A deck built on your PC won't appear on your phone.
- The app keeps one deck at a time. Use **Clear deck** to start a new one.
- Clearing your browser history or site data erases the saved deck. To keep a copy, write your list down and use **Paste a card list** to bring it back.

## Guardian Stars in short

When two monsters battle, the one whose star beats the other's gets **+500 ATK and DEF** for that battle. There are two cycles:

- ☉ Sun → ☽ Moon → ♀ Venus → ☿ Mercury → ☉ Sun
- ♂ Mars → ♃ Jupiter → ♄ Saturn → ♅ Uranus → ♇ Pluto → ♆ Neptune → ♂ Mars

Each star beats the next one. You choose one of a monster's two stars when you play it.

## Good to know

- Every add, remove or clear shows a message at the bottom of the screen with **Undo**.
- On iPhone, a downloaded HTML file won't run from the Files app, so use the link instead.
- **Card pictures:** when you're online, each card shows its picture from [YGOPRODeck](https://ygoprodeck.com). Pictures you've seen are kept in your browser (the last 150, about 2 MB), so they also show offline. A few Forbidden Memories-only cards have no picture and show their type icon instead.

Fusion results come from a fan-made database. If a result in your game differs, trust the game.

## Credits

- Card, fusion and ritual data and type icons: [YGO FM Database](https://github.com/falsepopsky/YGO-FM-Database) (GPL-3.0). That project was forked from Solumin's fusion calculator, with card data by duke1102 based on the GameFAQs Fusion FAQ.
- Card pictures: [YGOPRODeck](https://ygoprodeck.com), loaded in your browser. Card art © Konami.
- Cinzel font: the Cinzel Project Authors, SIL Open Font License.
- This app is licensed under GPL-3.0.

This is a fan project. It isn't affiliated with or endorsed by Konami. Yu-Gi-Oh! and its card names belong to their owners.
