# Taekwondo motion correction

The previous unconstrained CCD leg solver could select the reverse knee branch.
It has been replaced with analytic two-bone IK with an explicit knee bending plane, fixed bone lengths, a capped reach and ankle alignment.
Front kick and roundhouse are split into chamber, extension, retraction and landing.
Roundhouse uses a lateral foot path and support-foot pivot rather than spinning the entire fighter through the target.

References:
- Kukkiwon, Chagi (Kicking): https://www.kukkiwon.or.kr/eng/board/read?boardManagementNo=56&boardNo=1368&menuLevel=3&menuNo=73&page=1&searchCategory=&searchType=&searchWord=
- Kukkiwon instructional video references: https://www.youtube.com/watch?v=hnmAAO6lzEw (Ap Chagi), https://www.youtube.com/watch?v=ooBgJ1Tv_58 (Dollyo Chagi).

YouTube video fetching was throttled in this session. These are references, not a claim of downloaded video analysis or model training.
The implemented motions are manually authored game animations, not motion-capture clips or a certified technique demonstration.

Checks:
- 732 poses spanning both MPFB models, front/roundhouse kicks and three headings: knee bend plane, constant bone lengths and floor clearance.
- Actual hand/foot contact tests for both models and all three attacks.
- Browser review controls can freeze chamber, extension and recovery for inspection.

## Follow-up: joint-angle based leg animation
The kicking leg now uses forward kinematics, not target-driven leg IK. Authored hip/knee angles drive chamber, extension and recovery. Front kick extends with 6 degrees knee flexion; roundhouse extends with 7 degrees. Contact reads the real foot position and never changes the leg to force a hit. Walking also uses authored leg angles; arm IK is unchanged.
The updated 732-pose test compares actual measured knee flexion against authored angles, including <=7 degrees through the extension interval. Actual contact tests and build pass. Browser inspection used the male MPFB model and an oblique side view.

## Follow-up: whole-body motion (2026-11-07)
Limbs alone looked stiff. The body now drives every technique (src/human-mpfb.js, pose()):
- Stance: side-on fighting stance (left side leads, about 28 degrees), split feet with soft knees, a light bounce on the toes; slight torso sway.
- Punch (jireugi): the hips turn first, then the torso twists 24 degrees and the fist follows; a short step-in; the other hand pulls back.
- Front kick (ap chagi): hips square up, torso leans back 16 degrees, support heel rises; the kicking-side arm swings down.
- Roundhouse (dollyo chagi): the body pivots about 100 degrees on the planted support foot (the foot turns in place, it never slides), torso leans away 24 degrees, both arms counter-swing.
- Hit reaction: the defender recoils (lean back, twist away), fading with the hit flash.
- Signs for lean/twist/stance are calibrated per skeleton at load (rigs differ in bone axes).
References: hip and support-leg rotation as the kick's power source and pivoting on the ball of the foot (secondary sources describing Kukkiwon-style dollyo chagi); side-on gyeorugi stance with weight on the back leg and a bounce. These are authored game motions, not motion capture.
Check: node verify-dynamics.mjs (bounce, pivot, twist, lean, recoil, planted support foot, nothing below the floor; all 5 fighters).
- Side kick (yeop chagi, key U): body turns side-on about 95 degrees from the stance on the planted foot, knee drawn to the chest then a straight thrust, torso leans away 30 degrees.
- Back hook kick (dwi huryeo chagi, key I): a full 360-degree backward turn on the support foot, hands tucked; the heel sweeps across the target (hip opening +35 to -35 degrees) while the back faces it.
