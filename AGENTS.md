# Architecture decisions
- Chat authorization and verified adult labels are decided in database policies/functions, not client-held roles, to prevent impersonation and unauthorized conversation creation.
- The Hub keeps its existing child routes inside a shared conversation shell so links to groups, direct chat, code, and arena remain valid.
- Competition countdowns advance from a server-time sample using performance.now(), so changing the device wall clock cannot change deadlines.
- Fullscreen exits and warning deadlines are recorded by an authenticated database function, so disqualification survives reloading the arena.
- Plain text lesson imports normalize to the existing text-language reader fields, so text and coding lessons share one course and progress model.