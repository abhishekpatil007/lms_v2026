export function requireRole(allowed = []) {
    return (req, res, next) => {
        const role = req.user?.role || req.user?.user?.role;
        if (!role) return res.status(401).json({ message: 'No role in token' });
        if (!allowed.includes(role)) return res.status(403).json({ message: 'Forbidden' });
        next();
    };
}
