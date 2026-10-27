# Chili Cook-Off

A yearly neighborhood chili cook-off: Cooks bring Chilis, Guests taste and vote, and the Results are revealed at a set time.

## Language

### Events

**Event**:
One year's cook-off. There is at most one Event per year.
_Avoid_: Edition, season

**Past Event**:
An Event that has been archived, so its Results are kept once the next Event starts.
_Avoid_: Old event

**Phase**:
Where an Event stands: Setup, Voting or Revealed. Being archived is not a Phase.
_Avoid_: Status

**Setup**:
The Phase before Voting.

**Voting**:
The Phase between Setup and the Reveal.

**Reveal**:
The single moment when Voting closes and the Results become visible to everyone.

**Revealed**:
The Phase after the Reveal.

### People

**Guest**:
Anyone at an Event, including Cooks and the Host.
_Avoid_: Taster, attendee, user

**Cook**:
The person who brought a Chili.
_Avoid_: Entrant, chef

**Host**:
The person who runs the Event.
_Avoid_: Admin, organizer

**Voter**:
One identity Ballots are counted under. A Guest voting on two phones is two Voters.
_Avoid_: Device

### Chilis

**Chili**:
One pot of chili brought to an Event.
_Avoid_: Entry (as a noun for a Chili)

**Pot number**:
The number on a Chili's table card that Guests use to find it. It is a label, not the Chili's identity.
_Avoid_: Chili number

**Entries open**:
The window when Cooks can add Chilis. It may be open during Setup or Voting, never after the Reveal.

**Tag**:
A preset word, such as Spicy or Smoky, that Guests put on a Chili during Voting.
_Avoid_: Rating

### Ballots

**Ballot**:
A Voter's ranked top three Chilis, one Pick each. A Voter has at most one Ballot per Event.
_Avoid_: Vote (as a noun)

**Pick**:
One Chili's place on a Ballot: 1st, 2nd or 3rd, worth 3, 2 or 1 points.
_Avoid_: Choice

**Results**:
Every Chili ranked by its points from all Ballots.
_Avoid_: Standings, scores

**Ballot stuffing**:
More Ballots than Guests at an Event.
