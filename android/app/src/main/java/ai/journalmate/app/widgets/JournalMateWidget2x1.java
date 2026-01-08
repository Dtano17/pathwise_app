package ai.journalmate.app.widgets;

import ai.journalmate.app.R;

/**
 * 2x1 Compact Widget - Stats only (no rings).
 * Shows Done, Pending, and Activities counts in a horizontal row.
 */
public class JournalMateWidget2x1 extends BaseJournalMateWidget {

    @Override
    protected int getLayoutId() {
        return R.layout.widget_2x1_compact;
    }

    @Override
    protected boolean hasProgressRings() {
        return false;
    }

    @Override
    protected boolean hasStreak() {
        return false;
    }
}
