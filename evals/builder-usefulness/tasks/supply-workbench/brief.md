# Improve the supply-request workbench

Improve `starter.html` for the fictional office coordinator who fills requests from local stock. The current interface lists each team's needs and lets the coordinator write notes. Add help for choosing a quantity, understanding stock limits, and preserving unsaved work when changing requests.

Use `source.json` for the initial requests and stock. Keep selection, requester context, notes, and a visible record of completed decisions. Let the coordinator choose how many items to supply and record the reason. The quantity must be an integer from zero up to the lesser of requested and available stock. Completing the decision reduces stock exactly once.

Zero supplied requires a reason and the status Unavailable. Supplying fewer than requested also requires a reason, with the status Partly filled. The full requested amount produces Filled. Preserve drafts across selection changes, so returning to unfinished work recovers its quantity and note.

Keep completed requests identifiable and prevent completing one twice. Use plain request and stock vocabulary. An internal field called `fulfillment_state` should become a useful status, not a raw property label. The coordinator must be able to select, edit, and complete a request with the keyboard. On a narrow viewport, preserve the selected request and its decision controls. Use local state; a reload may reset the fixture. No procurement, accounts, approval policy, messaging, or external stock updates are included.
