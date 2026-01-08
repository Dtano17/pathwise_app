package ai.journalmate.app.widgets;

import ai.journalmate.app.R;

/**
 * 4x2 Large Widget - Ring + stats + streak.
 * Shows large triple ring, stats column, and streak footer.
 */
public class JournalMateWidget4x2 extends BaseJournalMateWidget {

    @Override
    protected int getLayoutId() {
        return R.layout.widget_4x2_large;
    }

    @Override
    protected boolean hasProgressRings() {
        return true;
    }

    @Override
    protected boolean hasStreak() {
        return true;
    }
}
