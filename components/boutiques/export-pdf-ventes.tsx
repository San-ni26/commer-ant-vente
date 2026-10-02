// src/components/boutiques/export-pdf-ventes.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, FileText } from "lucide-react"
import { getNomAuteurVente } from "@/lib/utils"
import { toast } from "sonner"

type Vente = {
    id: string
    montant: number
    description: string | null
    dateVente: Date | string
    nomEnregistrePar?: string | null
    roleEnregistrePar?: string | null
    enregistrePar?: {
        nom: string
        prenom?: string | null
    } | null
}

type Transaction = {
    id: string
    type: "VERSEMENT" | "DEPENSE"
    montant: number
    description: string | null
    dateTransaction: string
    reference?: string | null
}

interface ExportPDFProps {
    ventes: Vente[]
    transactions?: Transaction[]
    boutiqueNom: string
    totalVentes: number
    nombreVentes: number
    moyenne: number
    maxVente: number
    filtreActif: string
    dateDebut?: string
    dateFin?: string
}

export function ExportPDFVentes({
    ventes,
    transactions = [],
    boutiqueNom,
    totalVentes,
    nombreVentes,
    moyenne,
    maxVente,
    filtreActif,
    dateDebut,
    dateFin,
}: ExportPDFProps) {
    const [chargement, setChargement] = useState(false)

    const formatterMontant = (montant: number) => {
        const valeur = Math.round(montant)
        const valeurStr = valeur.toString()
        const parties = []
        for (let i = valeurStr.length; i > 0; i -= 3) {
            parties.unshift(valeurStr.substring(Math.max(0, i - 3), i))
        }
        return `${parties.join(" ")} FCFA`
    }

    const exporterPDF = async () => {
        setChargement(true)

        try {
            const { default: jsPDF } = await import("jspdf")
            const { default: autoTable } = await import("jspdf-autotable")

            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
            const pageWidth = doc.internal.pageSize.getWidth()

            // Calculs globaux
            const totalVersements = transactions
                .filter(t => t.type === "VERSEMENT")
                .reduce((s, t) => s + t.montant, 0)
            const totalDepenses = transactions
                .filter(t => t.type === "DEPENSE")
                .reduce((s, t) => s + t.montant, 0)
            const totalTransactions = totalVersements + totalDepenses
            const reste = totalVentes - totalTransactions

            // ── EN-TÊTE ──────────────────────────────────────────────
            doc.setFillColor(37, 99, 235)
            doc.rect(0, 0, pageWidth, 30, "F")

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(14)
            doc.setFont("helvetica", "bold")
            doc.text("Rapport — " + boutiqueNom, pageWidth / 2, 13, { align: "center" })

            doc.setFontSize(8)
            doc.setTextColor(200, 210, 255)
            const dateExport = new Date().toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
            })
            doc.text(`Généré le ${dateExport}`, pageWidth / 2, 22, { align: "center" })

            // ── PÉRIODE ───────────────────────────────────────────────
            let currentY = 38
            doc.setTextColor(80, 80, 100)
            doc.setFontSize(8)
            doc.setFont("helvetica", "bold")
            doc.text("PÉRIODE", 14, currentY)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(100, 100, 120)
            doc.text(
                filtreActif !== "personnalise"
                    ? filtreActif
                    : dateDebut && dateFin ? `Du ${dateDebut} au ${dateFin}` : filtreActif,
                14, currentY + 5
            )

            // ── RÉCAPITULATIF ─────────────────────────────────────────
            currentY = 52

            // Fond des stats
            doc.setFillColor(248, 250, 252)
            doc.roundedRect(14, currentY, pageWidth - 28, 42, 3, 3, "F")

            // Ligne 1 : Ventes
            doc.setFontSize(8)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(80, 80, 100)
            doc.text("Total ventes :", 20, currentY + 8)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(22, 163, 74)
            doc.setFontSize(10)
            doc.text(`+${formatterMontant(totalVentes)}`, 20, currentY + 15)

            // Nb ventes
            doc.setFont("helvetica", "bold")
            doc.setFontSize(8)
            doc.setTextColor(80, 80, 100)
            doc.text("Nombre de ventes :", pageWidth / 2, currentY + 8)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(37, 99, 235)
            doc.setFontSize(10)
            doc.text(nombreVentes.toString(), pageWidth / 2, currentY + 15)

            // Ligne 2 : Transactions
            doc.setFont("helvetica", "bold")
            doc.setFontSize(8)
            doc.setTextColor(80, 80, 100)
            doc.text("Total versements :", 20, currentY + 23)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(234, 88, 12)
            doc.setFontSize(9)
            doc.text(`-${formatterMontant(totalVersements)}`, 20, currentY + 30)

            doc.setFont("helvetica", "bold")
            doc.setFontSize(8)
            doc.setTextColor(80, 80, 100)
            doc.text("Total dépenses :", pageWidth / 2, currentY + 23)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(220, 38, 38)
            doc.setFontSize(9)
            doc.text(`-${formatterMontant(totalDepenses)}`, pageWidth / 2, currentY + 30)

            // Ligne 3 : Reste (sur fond coloré)
            const resteBg = reste >= 0 ? [220, 252, 231] : [254, 226, 226]
            const resteColor = reste >= 0 ? [22, 163, 74] : [220, 38, 38]
            doc.setFillColor(...resteBg as [number, number, number])
            doc.roundedRect(14, currentY + 36, pageWidth - 28, 12, 2, 2, "F")

            doc.setFont("helvetica", "bold")
            doc.setFontSize(9)
            doc.setTextColor(80, 80, 100)
            doc.text("RESTE (Ventes − Transactions) :", 20, currentY + 44)
            doc.setTextColor(...resteColor as [number, number, number])
            doc.setFontSize(11)
            const resteStr = (reste >= 0 ? "+" : "") + formatterMontant(reste)
            doc.text(resteStr, pageWidth - 20, currentY + 44, { align: "right" })

            // ── TABLEAU COMBINÉ (ventes + transactions) ───────────────
            // Construire tous les éléments triés par date décroissante
            type Ligne = { date: Date; type: string; description: string; ref: string; encaisseur: string; montant: number; signe: string }

            const lignes: Ligne[] = [
                ...ventes.map(v => ({
                    date: typeof v.dateVente === "string" ? new Date(v.dateVente) : v.dateVente,
                    type: "Vente",
                    description: v.description || "-",
                    ref: "-",
                    encaisseur: getNomAuteurVente(v),
                    montant: v.montant,
                    signe: "+",
                })),
                ...transactions.map(t => ({
                    date: new Date(t.dateTransaction),
                    type: t.type === "VERSEMENT" ? "Versement" : "Dépense",
                    description: t.description || "-",
                    ref: t.reference || "-",
                    encaisseur: "-",
                    montant: t.montant,
                    signe: "-",
                })),
            ].sort((a, b) => a.date.getTime() - b.date.getTime())

            const rows = lignes.map((l, i) => [
                (i + 1).toString(),
                l.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }),
                l.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                l.type,
                l.description,
                l.encaisseur,
                `${l.signe}${formatterMontant(l.montant)}`,
            ])

            currentY = currentY + 54

            autoTable(doc, {
                startY: currentY,
                head: [["N°", "Date", "Heure", "Type", "Description", "Par", "Montant"]],
                body: rows,
                theme: "striped",
                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: 255,
                    fontSize: 7,
                    fontStyle: "bold",
                    halign: "center",
                    cellPadding: 3,
                },
                bodyStyles: {
                    fontSize: 7,
                    textColor: 60,
                    cellPadding: 3,
                    valign: "middle",
                },
                columnStyles: {
                    0: { halign: "center", cellWidth: 8 },
                    1: { halign: "center", cellWidth: 18 },
                    2: { halign: "center", cellWidth: 13 },
                    3: { cellWidth: 20, halign: "center" },
                    4: { cellWidth: "auto", overflow: "linebreak" },
                    5: { cellWidth: 25, halign: "left" },
                    6: { halign: "right", cellWidth: 30, fontStyle: "bold" },
                },
                // Colorier les lignes selon le type
                didParseCell: function (data) {
                    if (data.section === "body") {
                        const type = rows[data.row.index]?.[3]
                        if (data.column.index === 6) {
                            if (type === "Vente") {
                                data.cell.styles.textColor = [22, 163, 74]
                            } else if (type === "Versement") {
                                data.cell.styles.textColor = [234, 88, 12]
                            } else {
                                data.cell.styles.textColor = [220, 38, 38]
                            }
                        }
                    }
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 14, right: 14 },
                rowPageBreak: "auto",
                pageBreak: "auto",
                showHead: "everyPage",
            })

            // ── PIED DE PAGE ──────────────────────────────────────────
            const pageCount = doc.getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                const ph = doc.internal.pageSize.getHeight()
                doc.setDrawColor(220, 220, 230)
                doc.setLineWidth(0.4)
                doc.line(14, ph - 12, pageWidth - 14, ph - 12)
                doc.setFontSize(7)
                doc.setTextColor(150, 150, 170)
                doc.setFont("helvetica", "normal")
                doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, ph - 6, { align: "center" })
            }

            const nomFichier = `rapport_${boutiqueNom.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
            doc.save(nomFichier)

            toast.success("PDF exporté avec succès !", {
                description: `${nombreVentes} ventes · ${transactions.length} transactions`,
            })
        } catch (erreur) {
            console.error("Erreur export PDF:", erreur)
            toast.error("Erreur lors de l'export PDF")
        } finally {
            setChargement(false)
        }
    }

    return (
        <Button
            onClick={exporterPDF}
            variant="outline"
            disabled={chargement || (ventes.length === 0 && transactions.length === 0)}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-50 to-white border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
        >
            {chargement ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération du PDF...
                </>
            ) : (
                <>
                    <FileText className="h-4 w-4 text-blue-600" />
                    Exporter en PDF
                </>
            )}
        </Button>
    )
}
