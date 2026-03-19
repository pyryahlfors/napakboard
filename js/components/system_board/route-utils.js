/**
 * Route utility functions for scoring and calculations
 */

export const routeScoreConstants = {
    BASE: 100,
    K: 30,
    M: 7
};

export const calculateRouteScore = (routeData) => {
    if(!routeData || !Array.isArray(routeData.approvals)) {
        return null;
    }

    let upvotes = 0;
    let downvotes = 0;

    routeData.approvals.forEach((approval) => {
        const value = typeof approval === 'number'
            ? approval
            : Number(approval && approval.value);

        if(value > 0) { upvotes++; }
        if(value < 0) { downvotes++; }
    });

    const n = upvotes + downvotes;
    if(n === 0) {
        return null;
    }

    const score = routeScoreConstants.BASE + routeScoreConstants.K * (upvotes - downvotes) / (n + routeScoreConstants.M);

    return {
        score: Math.round(score * 10) / 10,
        upvotes,
        downvotes,
        votes: n
    };
};

export const getRouteSortScore = (routeData) => {
    const scoreData = calculateRouteScore(routeData);
    return scoreData ? scoreData.score : routeScoreConstants.BASE;
};
