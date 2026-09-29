# Architecture decisions
- Chat authorization and verified adult labels are decided in database policies/functions, not client-held roles, to prevent impersonation and unauthorized conversation creation.
- The Hub keeps its existing child routes inside a shared conversation shell so links to groups, direct chat, code, and arena remain valid.