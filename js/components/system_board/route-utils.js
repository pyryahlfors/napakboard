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

export const calculateRouteTickStats = (routeData) => {
    const tickLog = routeData && Array.isArray(routeData.tickLog) ? routeData.tickLog : [];
    const activeTicks = routeData && Array.isArray(routeData.ticks) ? routeData.ticks.length : 0;

    let redpoints = 0;
    let flashes = 0;
    const comments = [];

    tickLog.forEach((entry) => {
        if(!entry) {
            return;
        }

        if(entry.type === 'redpoint') {
            redpoints++;
        } else {
            flashes++;
        }

        const comment = typeof entry.comment === 'string' ? entry.comment.trim() : '';
        if(comment) {
            comments.push(entry);
        }
    });

    comments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const totalAscents = redpoints + flashes;
    const redpointPercentage = totalAscents > 0 ? Math.round((redpoints / totalAscents) * 100) : 0;
    const flashPercentage = totalAscents > 0 ? Math.round((flashes / totalAscents) * 100) : 0;

    const routeDifficultyData = calculateRouteDifficulty(routeData);
    const gradeVotes = routeDifficultyData ? routeDifficultyData.votes : 0;
    const gradeDominantVotes = routeDifficultyData
        ? Math.max(routeDifficultyData.easierVotes, routeDifficultyData.sandbagVotes)
        : 0;
    const gradeAccuracy = gradeVotes > 0
        ? Math.round((gradeDominantVotes / gradeVotes) * 100)
        : 0;
    let gradeConsensus = 'No votes';
    if(routeDifficultyData) {
        gradeConsensus = routeDifficultyData.label || 'Split';
    }

    const routeScoreData = calculateRouteScore(routeData);
    const approvalVotes = routeScoreData ? routeScoreData.votes : 0;
    const approvalDominantVotes = routeScoreData
        ? Math.max(routeScoreData.upvotes, routeScoreData.downvotes)
        : 0;
    const approval = approvalVotes > 0
        ? Math.round((approvalDominantVotes / approvalVotes) * 100)
        : 0;
    let approvalConsensus = 'No votes';
    if(routeScoreData) {
        if(routeScoreData.upvotes > routeScoreData.downvotes) {
            approvalConsensus = 'Liked';
        } else if(routeScoreData.downvotes > routeScoreData.upvotes) {
            approvalConsensus = 'Disliked';
        } else {
            approvalConsensus = 'Split';
        }
    }

    return {
        totalTicks: tickLog.length || activeTicks,
        redpoints,
        flashes,
        redpointPercentage,
        flashPercentage,
        gradeAccuracy,
        gradeConsensus,
        approval,
        approvalConsensus,
        comments
    };
};
