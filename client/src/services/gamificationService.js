import api from "./api";

export const gamificationService = {
  getProfile: () => api.get("/gamification/profile"),
  getStreaks: () => api.get("/gamification/streaks"),
  getBadges: () => api.get("/gamification/badges"),
  markBadgesSeen: (badgeIds) => api.post("/gamification/badges/seen", { badgeIds }),
  getLeaderboard: (period = "monthly") => api.get(`/gamification/leaderboard?period=${period}`),
  getXPLeaderboard: () => api.get("/gamification/leaderboard/xp"),

  // Challenges
  getChallenges: () => api.get("/challenges"),
  getMineChallenges: () => api.get("/challenges/mine"),
  getChallengeHistory: () => api.get("/challenges/history"),
  joinChallenge: (id) => api.post(`/challenges/${id}/join`),
  abandonChallenge: (id) => api.post(`/challenges/${id}/abandon`),
};

export default gamificationService;
