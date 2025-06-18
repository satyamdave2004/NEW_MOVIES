

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require("dotenv").config();

function calculateCharges({ content_type, episodes, episode_runtime, imdb_rating, release_date }) {
    let charges = 0;
    let chargeBreakdown = [];

    // Movie Pricing
    if (content_type === 'movie') {
        // Base movie charge
        charges += 100;
        chargeBreakdown.push({ label: "Base Movie Charge", amount: 100 });

        // Extended runtime charge (for movies > 120 mins)
        if (episode_runtime > 120) {
            const extraBlocks = Math.ceil((episode_runtime - 120) / 20);
            const runtimeCharge = extraBlocks * 50;
            charges += runtimeCharge;
            chargeBreakdown.push({ 
                label: `Extended Runtime (${episode_runtime - 120} extra mins)`, 
                amount: runtimeCharge 
            });
        }

        // Rating-based premium
        if (imdb_rating > 9) {
            charges += 80;
            chargeBreakdown.push({ label: "Premium Rating (IMDb > 9)", amount: 80 });
        } else if (imdb_rating > 7.5) {
            charges += 50;
            chargeBreakdown.push({ label: "Good Rating (IMDb > 7.5)", amount: 50 });
        }
    } 
    // Series Pricing
    else {
        // Base series charge
        const baseSeriesCharge = 100 + (episodes * 50);
        charges += baseSeriesCharge;
        chargeBreakdown.push({ 
            label: `Base Series Charge (${episodes} episodes)`, 
            amount: baseSeriesCharge 
        });

        // Bulk episode discount (for every 5 episodes)
        if (episodes > 5) {
            const Blocks = Math.ceil(episodes / 5) -1;
            const bulkCharge= 20 * Blocks * episodes;
            charges += bulkCharge;
            chargeBreakdown.push({ 
                label: `Bulk Charge(${Blocks} blocks of 5)`, 
                amount: bulkCharge
            });
        }

        // Extended runtime charge (for episodes > 30 mins)
        if (episode_runtime > 30) {
            const runtimeCharge = episodes * 50;
            charges += runtimeCharge;
            chargeBreakdown.push({ 
                label: `Extended Runtime (${episode_runtime} mins/episode)`, 
                amount: runtimeCharge 
            });
        }

        // Rating-based premium for series
        if (imdb_rating > 9) {
            const ratingCharge = episodes * 50;
            charges += ratingCharge;
            chargeBreakdown.push({ 
                label: `Premium Rating (IMDb > 9)`, 
                amount: ratingCharge 
            });
        } else if (imdb_rating > 7.5) {
            const ratingCharge = episodes * 30;
            charges += ratingCharge;
            chargeBreakdown.push({ 
                label: `Good Rating (IMDb > 7.5)`, 
                amount: ratingCharge 
            });
        }
    }

    // Standard charges
    const convenienceCharge = 50;
    charges += convenienceCharge;
    chargeBreakdown.push({ label: "Convenience Fee", amount: convenienceCharge });

    // New release premium
    const releaseDate = moment(release_date, "YYYY-MM-DD");
    const daysSinceRelease = moment().diff(releaseDate, 'days');
    const newReleaseCharge = daysSinceRelease <= 45 ? 200 : 0;

    if (newReleaseCharge > 0) {
        charges += newReleaseCharge;
        chargeBreakdown.push({ 
            label: "New Release Premium (<45 days)", 
            amount: newReleaseCharge 
        });
    }

    // Tax calculation
    const subtotal = charges;
    const smst = Math.round(0.3 * subtotal);
    const grandTotal = subtotal + smst;

    return {
        charges,
        chargeBreakdown,
        subtotal,
        smst,
        grandTotal
    };
}

function printException(error) {
    const stack = error.stack.split('\n');
    console.error(`EXCEPTION IN (${stack[1].trim()}): ${error.message}`);
}

async function urlExists(url) {
    try {
        const response = await axios.head(url);
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

module.exports={
    calculateCharges,
    printException,
    urlExists
    };
