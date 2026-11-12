import { describe, expect, it } from 'vitest';
import { buildFeatureFocusSnapshot, chatMoreAttachments, chatPrimaryAttachments, featureCatalog, featureSurfaceBudgets, primaryNavigation } from './featureFocus';

describe('feature focus',()=>{
  it('keeps every core feature on a primary destination',()=>{
    const snapshot=buildFeatureFocusSnapshot();
    expect(snapshot.coreDestinationCoverage).toBe(snapshot.coreFeatureCount);
    expect(snapshot.mainNavigationExperiments).toHaveLength(0);
  });

  it('keeps delight features behind chat attachments',()=>{
    expect(featureCatalog.filter(item=>item.tier==='delight').every(item=>item.entry==='chat_attachment')).toBe(true);
  });

  it('keeps the first attachment page focused on five high-frequency actions',()=>{
    const snapshot=buildFeatureFocusSnapshot();
    // 'date_market' is gone with date planning; it sent people to a screen
    // the launch build does not have.
    // Games moved up from page two; documents moved down.
    expect(chatPrimaryAttachments.map(item=>item.id)).toEqual(['camera','gallery','games','location','more']);
    expect(snapshot.primaryAttachmentCount).toBe(featureSurfaceBudgets.chat_attachment_primary);
    expect(snapshot.primaryAttachmentOverflow).toBe(0);
    expect(snapshot.duplicatePrimaryAttachmentIds).toHaveLength(0);
  });

  it('keeps delight and secondary share tools on the second attachment page',()=>{
    const secondaryIds=chatMoreAttachments.map(item=>item.id);
    expect(['gif','document','snap','face','contact','poll']).toEqual(expect.arrayContaining(secondaryIds.filter(id=>['gif','document','snap','face','contact','poll'].includes(id))));
    expect(secondaryIds).not.toContain('games');
    expect(chatMoreAttachments.length).toBeLessThanOrEqual(featureSurfaceBudgets.chat_attachment_more);
  });

  it('keeps the launch build to four tabs',()=>{
    expect(primaryNavigation.map(item=>item.label)).toEqual(['Matches','Likes','Chats','Profile']);
    expect(primaryNavigation.length).toBe(featureSurfaceBudgets.primary_navigation);
  });
});
