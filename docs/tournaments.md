## Tournament Feature — Quick Reference

### Data model

```
tournaments
  └── tournament_registrations  (teams sign up)
  └── tournament_fixtures       (individual matches)
  └── tournament_standings      (auto-calculated points table)
  └── tournament_announcements  (organizer broadcasts)
  └── tournament_player_stats   (batting/bowling per tournament)
```

### Match formats supported
| Format | How it works |
|--------|-------------|
| LEAGUE | All teams play each other, standings by points |
| KNOCKOUT | Single elimination, one loss = out |
| GROUP_KNOCKOUT | Group stage → knockout rounds |
| ROUND_ROBIN | Everyone plays everyone, standings only |
| CUSTOM | Organizer manually manages fixtures |

### Status flow
```
DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → ONGOING → COMPLETED
                                                          └→ CANCELLED
```

### Key functions
- `register_team_for_tournament(tournament_id, team_id)` — team captain calls this
- `recalculate_tournament_standings(tournament_id)` — auto-fires after every fixture result

### Points (configurable per tournament)
- Win: 3pts (default)
- Draw: 1pt
- Loss: 0pts

### Standings tiebreaker order
1. Points
2. NRR (net run rate for cricket / goal difference for football)
3. Runs scored / Goals for

### Pages to build next
- `/tournament/[id]` — public tournament page (overview, fixtures, standings, stats)
- `/tournament/[id]/register` — team registration
- `/captain/tournament/[id]` — organizer control panel (approve teams, enter results, create fixtures)
- `/create/tournament` — tournament creation form
