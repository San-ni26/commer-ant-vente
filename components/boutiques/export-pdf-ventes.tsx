// src/components/boutiques/export-pdf-ventes.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

type Vente = {
    id: string
    montant: number
    description: string | null
    dateVente: Date | string
    enregistrePar: {
        nom: string
        prenom?: string | null
    }
}

interface ExportPDFProps {
    ventes: Vente[]
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

    // Fonction pour formater les montants correctement
    const formatterMontant = (montant: number) => {
        const valeur = Math.round(montant)
        const valeurStr = valeur.toString()
        const parties = []
        for (let i = valeurStr.length; i > 0; i -= 3) {
            parties.unshift(valeurStr.substring(Math.max(0, i - 3), i))
        }
        const nombreFormate = parties.join(' ')
        return `${nombreFormate} FCFA`
    }

    const exporterPDF = async () => {
        setChargement(true)

        try {
            const { default: jsPDF } = await import("jspdf")
            const { default: autoTable } = await import("jspdf-autotable")

            const doc = new jsPDF({
                orientation: "portrait", // Format vertical
                unit: "mm",
                format: "a4",
            })

            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()

            // === EN-TÊTE ===
            doc.setFillColor(37, 99, 235)
            doc.rect(0, 0, pageWidth, 30, "F")

            // Titre principal
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(14)
            doc.setFont("helvetica", "bold")
            doc.text("Rapport des ventes : " + boutiqueNom, pageWidth / 2, 15, { align: "center" })

            // Date d'export
            doc.setFontSize(8)
            doc.setTextColor(200, 210, 255)
            const dateExport = new Date().toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
            doc.text(`Généré le ${dateExport}`, pageWidth / 2, 20, { align: "center" })

            // === PÉRIODE ET FILTRES ===
            let currentY = 40
            doc.setTextColor(80, 80, 100)
            doc.setFontSize(9)
            doc.setFont("helvetica", "bold")
            doc.text("PÉRIODE D'ANALYSE", 14, currentY)

            doc.setFont("helvetica", "normal")
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 120)

            if (filtreActif !== "personnalise") {
                doc.text(`Filtre : ${filtreActif}`, 14, currentY + 6)
            } else if (dateDebut && dateFin) {
                doc.text(`Du ${dateDebut} au ${dateFin}`, 14, currentY + 6)
            }

            // === STATISTIQUES ===
            currentY = 55

            // Fond gris clair pour les stats
            doc.setFillColor(248, 250, 252)
            doc.roundedRect(14, currentY, pageWidth - 28, 32, 3, 3, "F")

            // Ligne 1 des stats
            doc.setFontSize(9)
            doc.setTextColor(80, 80, 100)

            // Total
            doc.setFont("helvetica", "bold")
            doc.text("Total des ventes :", 20, currentY + 7)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(37, 99, 235)
            doc.setFontSize(10)
            doc.text(formatterMontant(totalVentes), 20, currentY + 13)

            // Nombre de ventes
            doc.setFont("helvetica", "bold")
            doc.setTextColor(80, 80, 100)
            doc.setFontSize(9)
            doc.text("Nombre de ventes :", pageWidth / 2, currentY + 7)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(34, 197, 94)
            doc.setFontSize(10)
            doc.text(nombreVentes.toString(), pageWidth / 2, currentY + 13)

            // Ligne 2 des stats
            // Moyenne
            doc.setFont("helvetica", "bold")
            doc.setTextColor(80, 80, 100)
            doc.setFontSize(9)
            doc.text("Panier moyen :", 20, currentY + 20)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(245, 158, 11)
            doc.setFontSize(9)
            doc.text(formatterMontant(Math.round(moyenne)), 20, currentY + 26)

            // Vente max
            doc.setFont("helvetica", "bold")
            doc.setTextColor(80, 80, 100)
            doc.setFontSize(9)
            doc.text("Vente maximum :", pageWidth / 2, currentY + 20)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(239, 68, 68)
            doc.setFontSize(9)
            doc.text(formatterMontant(maxVente), pageWidth / 2, currentY + 26)

            // === TABLEAU AVEC DÉBORDEMENT GÉRÉ ===
            const rows = ventes.map((v, index) => {
                const date = typeof v.dateVente === "string" ? new Date(v.dateVente) : v.dateVente
                const description = v.description || "-"
                const encaisseur = `${v.enregistrePar.prenom || ""} ${v.enregistrePar.nom}`.trim()
                const montantFormate = formatterMontant(v.montant)

                return [
                    (index + 1).toString(),
                    date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }),
                    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                    description,
                    encaisseur || "—",
                    montantFormate,
                ]
            })

            autoTable(doc, {
                startY: currentY + 42,
                head: [["N°", "Date", "Heure", "Description", "Encaissé par", "Montant"]],
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
                    0: { halign: "center", cellWidth: 10 },
                    1: { halign: "center", cellWidth: 20 },
                    2: { halign: "center", cellWidth: 15 },
                    3: {
                        cellWidth: "auto",
                        overflow: "linebreak",
                    },
                    4: { cellWidth: 30, halign: "left" },
                    5: { halign: "right", cellWidth: 35, fontStyle: "bold" },
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: 14, right: 14 },
                rowPageBreak: "auto",
                pageBreak: "auto",
                showHead: "everyPage",
                tableWidth: "auto",
                styles: {
                    overflow: "linebreak",
                    cellWidth: "wrap",
                },
                didDrawPage: function (data) {
                    // Pied de page pour chaque nouvelle page
                    const currentPageHeight = doc.internal.pageSize.getHeight()
                    doc.setDrawColor(220, 220, 230)
                    doc.setLineWidth(0.5)
                    doc.line(14, currentPageHeight - 12, pageWidth - 14, currentPageHeight - 12)
                },
            })

            // Récupérer le nombre réel de pages
            const pageCount = doc.getNumberOfPages()

            // Redessiner les pieds de page pour toutes les pages avec le bon numéro
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                const currentPageHeight = doc.internal.pageSize.getHeight()

                doc.setDrawColor(220, 220, 230)
                doc.setLineWidth(0.5)
                doc.line(14, currentPageHeight - 12, pageWidth - 14, currentPageHeight - 12)

                doc.setFontSize(7)
                doc.setTextColor(150, 150, 170)
                doc.setFont("helvetica", "normal")
                doc.text(
                    `Page ${i} / ${pageCount}`,
                    pageWidth / 2,
                    currentPageHeight - 6,
                    { align: "center" }
                )
            }

            // Télécharger
            const nomFichier = `rapport_ventes_${boutiqueNom.replace(/\s+/g, "_")}_${new Date().toISOString().split('T')[0]}.pdf`
            doc.save(nomFichier)

            toast.success("PDF exporté avec succès !", {
                description: `${nombreVentes} ventes exportées`,
            })
        } catch (erreur) {
            console.error("Erreur export PDF:", erreur)
            toast.error("Erreur lors de l'export PDF", {
                description: "Vérifiez votre connexion et réessayez",
            })
        } finally {
            setChargement(false)
        }
    }

    return (
        <Button
            onClick={exporterPDF}
            variant="outline"
            disabled={chargement || ventes.length === 0}
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