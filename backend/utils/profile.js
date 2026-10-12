const makeUsername = (name, id) => {
    const slug = String(name || "developer")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24) || "developer";
    return `${slug}-${String(id).toLowerCase()}`;
};

export const normalizeTechnologyTags = (value) => {
    if (!Array.isArray(value) || value.length > 20 ||
        value.some((tag) => typeof tag !== "string" || !tag.trim() || tag.trim().length > 40)) {
        return null;
    }
    return [...new Map(value.map((tag) => [tag.trim().toLowerCase(), tag.trim()])).values()];
};

export const isHttpsUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
    } catch {
        return false;
    }
};

export const isGitHubProfileUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "github.com" &&
            !url.username && !url.password && url.pathname.split("/").filter(Boolean).length === 1;
    } catch {
        return false;
    }
};

export const ensureUsername = async (user) => {
    if (!user.username) {
        user.username = makeUsername(user.name, user._id);
        await user.save();
    }
    return user;
};

export const getSafeUserProfile = (user) => ({
    id: String(user._id),
    name: user.name,
    username: user.username,
    email: user.email ?? "",
    avatar: isHttpsUrl(user.avatar) ? user.avatar : "",
    bio: user.bio ?? "",
    profileVisibility: user.profileVisibility ?? "private",
    technologies: user.technologies ?? [],
    githubUsername: user.githubUsername ?? "",
    githubProfileUrl: isGitHubProfileUrl(user.githubProfileUrl)
        ? user.githubProfileUrl
        : user.githubUsername
            ? `https://github.com/${encodeURIComponent(user.githubUsername)}`
            : "",
    githubConnected: Boolean(user.githubId)
});
