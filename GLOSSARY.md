# Chili Cook-Off

A yearly neighborhood chili cook-off: cooks bring chilis, guests taste and vote, and the results are revealed at a set time.

## Language

**Event**:
One year's cook-off, from setup through the reveal. There is at most one Event per year, and a year identifies it.
_Avoid_: Edition, cook-off (for a single year), season

**Past Event**:
An Event whose results have been archived to the history.
_Avoid_: Archive, old event

**Phase**:
Where an Event stands: Setup, Voting or Revealed. Being archived is not a Phase.
_Avoid_: Status, state, stage

**Setup**:
The Phase before Voting, when Cooks add Chilis and the host prepares the Event.

**Voting**:
The Phase when Voters tag Chilis and submit Ballots. It ends at the Reveal.

**Reveal**:
The moment Voting closes and the results become visible to everyone. Closing Voting early just moves the Reveal earlier.
_Avoid_: Voting closed (as a separate moment)

**Revealed**:
The Phase after the Reveal, when the results are visible.

### People

**Guest**:
Anyone attending an Event.
_Avoid_: Taster, attendee, user

**Cook**:
A Guest who added a Chili to the Event.
_Avoid_: Entrant, chef, owner

**Voter**:
One browser holding a signed voter ID. A Guest who votes on two phones is two Voters.
_Avoid_: Device, taster, user

### Chilis

**Chili**:
One pot of chili a Cook brings to an Event.

**Pot number**:
The label on a Chili's table card that Guests use to find it. It is not the Chili's identity: the host can renumber pots, and numbers restart each Event.
_Avoid_: Chili number, entry number

**Entries open**:
The window, set by the host, when Cooks can add Chilis. It is not tied to a phase.
_Avoid_: Entry (as a noun for a Chili)

### Voting

**Ballot**:
One Voter's ranked 1st, 2nd and 3rd Picks of three different Chilis. A Voter has at most one Ballot per Event.
_Avoid_: Vote (as a noun)

**Pick**:
One Chili's place on a Ballot: 1st, 2nd or 3rd.
_Avoid_: Vote, choice

**Ballot stuffing**:
More Ballots than Guests at an Event.
