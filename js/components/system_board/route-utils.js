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

export const calculateRouteDifficulty = (routeData) => {
    if(!routeData || !Array.isArray(routeData.approvals)) {
        return null;
    }

    let easierVotes = 0;
    let sandbagVotes = 0;

    routeData.approvals.forEach((approval) => {
        const value = Number(approval && approval.difficulty);
        if(value < 0) { easierVotes++; }
        if(value > 0) { sandbagVotes++; }
    });

    const totalVotes = easierVotes + sandbagVotes;
    if(totalVotes === 0) {
        return null;
    }

    if(easierVotes === sandbagVotes) {
        return {
            label: null,
            easierVotes,
            sandbagVotes,
            votes: totalVotes
        };
    }

    return {
        label: easierVotes > sandbagVotes ? 'Soft' : 'Sandbag',
        easierVotes,
        sandbagVotes,
        votes: totalVotes
    };
};
