# Video workflow research

Reviewed 5 November 2026. Sources are public Reddit discussions, then the actual
repositories and official docs. Votes and enthusiasm are not a controlled quality
comparison. Cross-posts of the same demo count as one example.

## Findings used in the selection

| Discussion | Kind of evidence | Useful finding |
|---|---|---|
| [Remotion vs HyperFrames](https://www.reddit.com/r/buildinpublic/comments/1so1vmm/anyone_tried_hyperframes_yet_been_using_remotion/) | Multiple mixed user reports | Both workflows can be useful; setup, iteration time and aesthetic judgments vary. Keep both and choose per project. |
| [A full video editing workflow](https://www.reddit.com/r/ClaudeCode/comments/1r0btpu/i_edited_this_video_100_with_codex_workflow/) | Detailed creator account with caveats | Storyboards, rendered stills and repeated review mattered; the author explicitly says this first-principles workflow initially took longer than manual editing. |
| [A HyperFrames product launch](https://www.reddit.com/r/SideProject/comments/1vr0sa3/i_made_this_launch_video_for_my_chrome_extension/) | Creator report, not a benchmark | Word-level voice sync, real product material and a recomposed portrait version form a practical combination. It took substantial iteration. |
| [Motion-design skill with a demo](https://www.reddit.com/r/ClaudeDesign/comments/1wyyb8e/awesome_agent_skill_for_motion_design_remotion/) | TechNomadCode's own demo and discussion | A small concept → storyboard → production workflow is available as a real MIT skill. Installed as an explicit alternative; repeated posts are not independent endorsements. |
| [Shotcraft discovery post](https://www.reddit.com/r/BestGitHubRepos/comments/1x49x1m/videoshotcraft_ai_video_skill_for_claude_code/) | Promotional directory post quoting the README | Points to a substantial shot library. The recipe cards and TSX implementations were inspected separately; the post alone is not a quality test. |
| [Improving an explanatory HyperFrames piece](https://www.reddit.com/r/opencode/comments/1x2zutp/my_short_experience_in_composing_videos_with/) | User examples and a practical reply | Clear visual protagonists and seeking to a frame from both directions are useful checks. |

## Installed combinations

- **Product film:** Video Shotcraft + the official Remotion knowledge pack +
  composition/art direction + beat-sync editing. The installed Shotcraft source
  includes its gallery index, recipe cards, demos, shared fixtures and workbench.
- **HTML explainer and overlays:** the four core HyperFrames skills + official
  GSAP core/timeline/plugins/utils/performance skills + local rendering.
- **Visual craft:** LottieFiles motion design + iart.ai animation principles,
  composition, color, direction and rhythm. Load the relevant topic only.
- **Recorded shorts:** the existing short-editing, script, B-roll and versioned
  frame-review workflow. The new stack extends it rather than replacing a project.

Exact source revisions and paths: [stack.lock.json](../stack.lock.json).

## Investigated but not made a default

- [MWEJ/footage-to-film](https://github.com/MWEJ/footage-to-film), mentioned in
  [this thread](https://www.reddit.com/r/claude/comments/1x40xo6/best_workflow_for_motion_design_for_short_video/),
  returned HTTP 404 during the check. It could not be inspected or installed.
- [Kinetograph](https://github.com/0xS4N4TG/kinetograph) is promising, but its
  [Reddit speed claims](https://www.reddit.com/r/claudeskills/comments/1xe0eq9/i_rewrote_remotion_to_be_5x_faster/)
  do not establish compatibility with all existing effects. Its `LICENSE.md` uses
  PolyForm Small Business terms. It is not a permissively licensed replacement
  silently substituted into these projects.
- [SageCut](https://github.com/levantolabs/sagecut-release) has MIT plugin code,
  while the [creator's post](https://www.reddit.com/r/claudeskills/comments/1x6n0t2/i_made_a_claude_skill_because_checking_my/)
  says its QA requires a paid Sage API. It was not connected or used for this setup.
- Blender MCP can add real Blender control, but it is a separate application and
  server setup. This stack instead includes a locally verified Three.js route;
  no remote installer from a promotional list is executed.

The Remotion SDK's [license terms](https://www.remotion.dev/docs/license/pricing)
are separate from third-party skill licenses. HyperFrames' source uses Apache 2.0;
its local renderer and paid media/cloud features should not be conflated.
