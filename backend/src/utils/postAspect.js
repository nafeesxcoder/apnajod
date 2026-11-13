/**
 * The three shapes a post can be cropped to, as width / height - the same
 * three Instagram offers. Anything else is stored as square, so a bad value
 * can never stretch a post into a strip.
 */
const POST_ASPECTS = [1, 0.8, 1.91];

function cleanAspect(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  const match = POST_ASPECTS.find((aspect) => Math.abs(aspect - number) < 0.01);
  return match ?? 1;
}

/** FLOAT comes back as 0.800000011920929; posts carry the clean figure. */
function roundAspect(value) {
  return cleanAspect(Math.round(Number(value) * 100) / 100);
}

module.exports = { POST_ASPECTS, cleanAspect, roundAspect };
