export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jsPDF } from 'jspdf';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.employee.id },
      include: {
        department: true,
        branch: true,
        shift: true,
        manager: { select: { firstName: true, lastName: true, designation: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: employee.organizationId },
      select: { name: true },
    });
    const organizationName = org?.name || 'Salman Enterprises';

    const doc = new jsPDF();

    // Header Banner (#15172B)
    doc.setFillColor(21, 23, 43);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(organizationName.toUpperCase(), 16, 17);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(196, 181, 253);
    doc.text('OFFICIAL APPOINTMENT & EMPLOYMENT SUMMARY LETTER', 16, 26);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(`Issued Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, 16, 48);
    doc.text(`Employee Reference: ${employee.employeeCode}`, 16, 55);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Dear ${employee.firstName} ${employee.lastName},`, 16, 70);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    const bodyText =
      `This document confirms your active appointment with ${organizationName}. Below are your verified employment details recorded in our Human Resource workspace:`;
    const wrapped = doc.splitTextToSize(bodyText, 178);
    doc.text(wrapped, 16, 80);

    const rows: [string, string][] = [
      ['Full Name', `${employee.firstName} ${employee.lastName}`],
      ['Employee Code', employee.employeeCode],
      ['Designation', employee.designation],
      ['Department', employee.department.name],
      ['Assigned Branch', `${employee.branch.name}${employee.branch.city ? ` (${employee.branch.city})` : ''}`],
      ['Reporting Manager', employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName} (${employee.manager.designation})` : 'Executive Administration'],
      ['Assigned Shift', `${employee.shift.name} (${employee.shift.startTime} - ${employee.shift.endTime})`],
      ['Date of Joining', new Date(employee.joiningDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })],
      ['Employment Type', employee.employmentType.replace(/_/g, ' ')],
      ['Employment Status', employee.employmentStatus],
    ];

    let y = 104;
    for (const [label, val] of rows) {
      doc.setFillColor(246, 245, 255);
      doc.rect(16, y - 5, 178, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(label, 20, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(val), 85, y + 1);
      y += 11;
    }

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'This employment letter is generated directly from verified HR workspace records for official reference.',
      16,
      268
    );

    const pdfBytes = doc.output('arraybuffer');
    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Appointment_Letter_${employee.employeeCode}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate letter' }, { status: 500 });
  }
}
