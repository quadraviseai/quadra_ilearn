from django.utils import timezone

from apps.guardians.models import GuardianStudentLink


def accept_invite_for_student(student_profile, invite_token):
    link = GuardianStudentLink.objects.filter(student=student_profile, invite_token=invite_token).first()
    if not link:
        raise ValueError("Invite token is invalid for this student.")

    if link.status == GuardianStudentLink.Status.ACTIVE:
        return link

    link.status = GuardianStudentLink.Status.ACTIVE
    link.accepted_at = timezone.now()
    link.save(update_fields=["status", "accepted_at"])
    return link
