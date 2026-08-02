// Gate a route to one or more roles. Always used AFTER requireAuth, and
// always checks req.user.role as loaded fresh from the DB (see auth.js) —
// never trusts a role claim from the request body or an unverified token.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

// Shortcut for admin-only routes (the entire /admin/* route group uses this).
const requireAdmin = requireRole('admin');

// A moderator may only act within communities they are assigned to
// moderate; admins bypass this check. Expects req.params.communityId (or
// req.body.communityId as a fallback) to identify the target community.
function requireCommunityModOrAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (req.user.role === 'admin') return next();

  if (req.user.role !== 'moderator') {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }

  const communityId = req.params.communityId || req.body.communityId;
  const isScoped = (req.user.moderatedCommunities || []).some(
    (id) => id.toString() === String(communityId)
  );
  if (!isScoped) {
    return res.status(403).json({ message: 'Forbidden: not a moderator of this community' });
  }
  next();
}

module.exports = { requireRole, requireAdmin, requireCommunityModOrAdmin };
