(function(window) {

    // Dependencies
    var $ = window.jQuery;

    var ecMap = window.ecMap || {};
    window.ecMap = ecMap;

    /* ecMap.status
     * Public interface, aliased for convenience within this closure
     */
    var status = ecMap.status = {};
    /* _status
     * Private state object
     *     year <number> - The year to display. This allows for coloring
     *         according to the changing distribution of electoral votes
     *     stateVotes <object> - A collection describing the vote distribution
     *         for each state.
     *         {
     *             <state name>: {
     *                 dem: <number> - Number of electoral votes for the Democratic party
     *                 rep: <number> - Number of electoral votes for the Republican party
     *                 toss: <number> - Number of tossup electoral votes
     *             }
     *         }
     *    totals <object> - This value is calculated from the "stateVotes"
     *        objects each time it is modified.
     *        {
     *            dem: <number> - Number of electoral votes for the Democratic party
     *            rep: <number> - Number of electoral votes for the Republican party
     *            toss: <number> - Number of tossup electoral votes
     *        }
     */
    var _status = {
        stateVotes: {},
        totals: {}
    };
    var eventBus = $("<div>");
    var changedStates;

    /* on
     * Subscribe to map-related events.
     * Arguments:
     *   - eventName <string> An identifier for the type of event to listen for
     *     (see event types below)
     *   - handler <function> The function to be invoked when the event occurs.
     * Events types:
     *   - "change" - triggered any time the state of the map changes
     *   - "change:state" - triggered each time a state changes (note that when
     *      this event fires as part of a collection of concurrent state
     *      changes, the status of the map will be completely set BEFORE these
     *      events fire)
     */
    status.on = $.proxy(eventBus.bind, eventBus);
    /* off
     * Unsubscribe from map-related events
     * Arguments:
     *   - eventName <string> An identifier for the type of event to list for
     *   - handler <function> The function to be invoked when the event occurs.
     *     If unspecified, all events bound to the supplied event type will be
     *     unbound.
     * Event types:
     *   - (see listing in "on")
     */
    status.off = $.proxy(eventBus.unbind, eventBus);
    /* set
     * Set the status of the map. Re-calculates total vote counts; fires an
     * "change:state" event for each state followed by a single "change" event
     * neweStatus <object> - Describes the new status of the map
     *     year <number> - See description in "_status" above
     *     stateVotes <object> - See description in "_status" above
     */
    status.set = function(newStatus) {

        var idx, len;
        var statusChange = false;

        if ("year" in newStatus) {
            _status.year = newStatus.year;
            statusChange = true;
        }

        changedStates = {};

        if ("stateVotes" in newStatus) {

            _status.totals.dem = _status.totals.rep = _status.totals.toss = 0;

            $.each(newStatus.stateVotes, function(stateName, newVotes) {

                $.each(newVotes, function(partyName, newVoteCount) {
                    // Initialization case
                    if (!_status.stateVotes[stateName] ||
                        _status.stateVotes[stateName][partyName] !== newVoteCount) {
                        changedStates[stateName] = newVotes;
                        return false;
                    }
                });

                _status.stateVotes[stateName] = newVotes;
                _status.totals.dem += newVotes.dem || 0;
                _status.totals.rep += newVotes.rep || 0;
                _status.totals.toss += newVotes.toss || 0;
            });

            // Now that the totals are re-calculated, trigger an change event
            // for each state
            $.each(newStatus.stateVotes, function(stateName, votes) {
                eventBus.trigger("change:state", {
                    name: stateName,
                    dem: votes.dem,
                    rep: votes.rep,
                    toss: votes.toss
                });
            });
            statusChange = true;
        }

        if (statusChange) {
            eventBus.trigger("change", status.get());
        }
    };
    /* changedStates
     * If any states were changed in the most recent call to "set", this method
     * will return the vote distribution of those states (formatted in the same
     * manner as "status.stateVotes"). If no states were changed, this
     * method will return false
     */
    status.changedStates = function() {

        var hasStates = false;

        if (changedStates) {
            $.each(changedStates, function() {
                hasStates = true;
                return false;
            });
        }

        if (!hasStates) {
            return false;
        } else {
            return changedStates;
        }
    };
    /* get
     * Create a copy of the map state
     */
    status.get = function() {
        return $.extend(true, {}, _status);
    };
    /* modifyVotes
     * A convenience method for modifying the distribution of votes within
     * states, relative to their current value.
     */
    status.modifyVotes = function(stateVoteDeltas) {

        var statesVotes = status.get().stateVotes;

        $.each(stateVoteDeltas, function(stateName, voteDelta) {

            var stateVotes = statesVotes[stateName];

            stateVotes.dem += voteDelta.dem || 0;
            stateVotes.rep += voteDelta.rep || 0;
            stateVotes.toss += voteDelta.toss || 0;
        });

        status.set({ stateVotes: statesVotes });
    };

}(this));
/* Example usages:
 *
 * // Responding to click events
 * var eventToken = nhmc.geo.usGeo[i].statePath.connect('onclick',
 *     nhmc.geo.usGeo[i].statePath,
 *     function() {
 *          // Modified version of genericHandler
 *     });
 *
 * // Updating the visualization...
 * // ...the map:
 * ecMap.status.on("change:state", function(event, stateStatus) {
 *     // Code consolidated from:
 *     //   - nebraskaHandler
 *     //   - maineHandler
 *     //   - genericHandler
 * });
 *
 * // ...the electoral results (numeric display)
 *
 * ecMap.status.on("change", function(event, status) {
 *     indicateWin(status.totals.rep, status.totals.dem, status.totals.toss);
 * });
 *
 * // Tracking map status in the document fragment
 *
 * ecMap.status.on("change", function(event, status) {
 *     window.location.hash = encodeURIComponent(JSON.stringify(status));
 * });
 */
