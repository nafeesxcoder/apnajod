import type { CoupleConnectionHub, CoupleConnectionRequest, CoupleModeProfileInput, CouplePartnerSummary } from '../../domain/coupleConnection';

export type { CoupleConnectionHub, CouplePartnerSummary } from '../../domain/coupleConnection';
const emptyHub: CoupleConnectionHub = { experienceMode: 'seeking', connection: null, connections: [], incomingRequests: [], outgoingRequests: [] };

export async function saveCoupleModeMemberProfile(_input: CoupleModeProfileInput) { return { preview: true }; }
export async function setServerCoupleMode(_enabled: boolean) { return { preview: true }; }
export async function searchCouplePartnerByPhone(_phone: string): Promise<CouplePartnerSummary> { throw new Error('Partner search requires the AWS couple port.'); }
export async function sendCoupleConnectionRequest(member: CouplePartnerSummary): Promise<CoupleConnectionRequest> {
  return { requestId: `preview-${Date.now()}`, member, status: 'pending', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() };
}
export async function respondToCoupleConnectionRequest(_requestId: string, _accept: boolean): Promise<CoupleConnectionHub> { return emptyHub; }
export async function fetchCurrentCoupleConnectionHub(): Promise<CoupleConnectionHub> { return emptyHub; }
