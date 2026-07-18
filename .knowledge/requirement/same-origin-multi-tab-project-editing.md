---
id: requirement:same-origin-multi-tab-project-editing
type: requirement
title: Same-Origin Multi-Tab Project Editing
---

Tabs in the same origin share one editing session when they open the same origin-private project.

```yaml
scope:
  key: origin_and_project_id
  different_project_ids: independent_sessions_allowed
entry: flow:open-origin-project-across-tabs
open_behavior:
  active_host_found: join_as_actor:session-participant
  no_active_host: atomically_claim_host_and_become_actor:session-host
  concurrent_claim: exactly_one_host; other_tabs_join_winner
authority:
  canonical_frontend: actor:session-host
  durable_writer: actor:session-host through system:persistence-worker
  secondary_tab: send_intents_and_render_host_ordered_state
  protocol: flow:host-authoritative-collaboration
leave_behavior:
  in_app_navigation_or_project_switch: require ui:local-session-leave-dialog
  browser_reload_or_tab_close: request_native_beforeunload_confirmation_while_joined
  cancelled_leave: retain_session_and_view
  confirmed_leave: disconnect_without_promoting_another_tab
failure:
  owner_detected_but_unreachable: fail_closed_and_offer_retry_or_close_other_tab
  ownership_ambiguous: do_not_open_writable_state
  optimistic_intent_during_forced_exit: never_present_as_durable_without_host_acceptance
acceptance:
  - Opening an already hosted project joins its host instead of showing a recovery storage error.
  - Opening a project with no active host makes the winning tab its host.
  - Two simultaneous opens cannot create two writable authorities for one project ID.
  - Only the host writes the project checkpoint and recovery journal.
  - A joined tab receives the host snapshot before editing.
  - Different project IDs can be hosted by different tabs.
  - Leaving a joined session asks for confirmation when the browser permits it.
  - Host loss never silently promotes a joined tab under decision:frontend-session-authority.
```
