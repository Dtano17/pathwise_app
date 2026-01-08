package ai.journalmate.app.widgets;

import ai.journalmate.app.R;

/**
 * 4x1 Wide Widget - Ring + stats with labels.
 * Shows small triple ring on left, stats with labels horizontally.
 */
public class JournalMateWidget4x1 extends BaseJournalMateWidget {

    @Override
    protected int getLayoutId() {
        return R.layout.widget_4x1_wide;
    }

    @Override
    protected boolean hasProgressRings() {
        return true;
    }

    @Override
    protected boolean hasStreak() {
        return false;
    }
}
